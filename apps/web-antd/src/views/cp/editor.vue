<script setup lang="ts">
/**
 * # CP(eaog) 编辑器
 *
 * 1. `属性编辑器`弹出窗，支持新建、编辑节点
 * 2. 支持复制、粘贴、删除节点
 * 3. 新建、粘贴时，可选择插入位置：前（兄弟节点、前）、后（兄弟节点、后）、子（作为子节点，仅对容器节点）、父（仅当添加、粘贴的节点为容器节点时）
 * 4. 复制时，可选择是否复制子树
 * 5. 删除时，可选择是否删除子树，如不删除子树，将孩子节点提升为当前节点的兄弟节点
 *
 * ## 开发惯例
 * 1. 尽量使用tailwindcss的类名来控制样式，保持一致性和可维护性。
 */

// 导入EaogNode组件和相关类型
import EaogNodeComponent from './components/eaog-node.vue';
import EaogContextMenu from './components/editor-context-menu.vue';
import EditorToolbar from './components/editor-toolbar.vue';
import {
  cloneDeepEaogNode,
  type EaogNode, insertNode, removeNode
} from './components/eaog-node';
import {complexFlow} from './eaog-samples';
import {onMounted, reactive, ref} from 'vue';

import EaogNodeForm from "#/views/cp/components/eaog-node-form.vue";
const eaogNodeForm =ref<InstanceType<typeof EaogNodeForm>>();

import Debug from 'debug';
const debug = Debug('aia:cp-editor');

// 当前选中的EAOG节点
const selectedNode = ref<EaogNode | null>(null);

// 保存当前右键点击的节点，可能与selectedNode不同
const contextMenuNode = ref<EaogNode | null>(null);

// 剪切板中的节点
const clipboardNode = ref<EaogNode | null>(null);
const clipboardWithChildren = ref(false);

// 示例EAOG流程
const eaogData = ref<EaogNode | null>(null);

// 处理节点点击事件
const handleNodeClick = (node: EaogNode) => {
  selectedNode.value = node;
};

// 处理节点右键点击事件，获取右键发生的节点
const handleContextMenu = (e: MouseEvent) => {
  // debug(`Context event event.defaultPrevented: ${e.defaultPrevented}`);
  // moveContextMenuToMousePosition(e);
  contextMenuNode.value = (e as any).eaogNode || null; // 从事件对象中获取当前节点
};

//  注意！HACK_FIX! 这里我们发现在右键菜单打开后，如果再次右键点击，菜单位置不会更新。
//  我们先试图用下面moveContextMenuToMousePosition函数来更新菜单位置，但发现这样会出现，菜单先出现在原有位置，然后再移动到鼠标位置的情况。体验不佳。
//  经过对源码的深入分析：我们发现问题出在vue-radix ContextMenu 通过创建虚拟元素（virtual element）来实现跟随鼠标位置显示菜单。@see https://deepwiki.com/search/contextmenu_474c04dd-1f1d-4751-8a84-28a4a010550d
//  奇怪的是，在其源码 ContextMenuTrigger.vue # virtualEl = computed(() => ...)中，加上一句 virtualEl.getBoundingClientRect() ，先计算一下，就可以解决问题。
//  @see .pnpm/radix-vue@1.9.17_vue@3.5.13_typescript@5.8.3_/node_modules/radix-vue/dist/index.js#L6070
//
// const moveContextMenuToMousePosition = async (e: MouseEvent) => {
//   // 获取菜单元素
//   const menu = document.querySelector('.eaog-context-menu') as HTMLElement | null;
//   const menuWrapper = menu?.parentElement as HTMLElement | null;
//   if (menuWrapper) {
//     // 设置菜单位置为鼠标位置
//     // await new Promise(resolve => setTimeout(resolve, 1000)); // 确保DOM更新
//     // menuWrapper.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
//   }
// };

const historyEaogData = reactive<EaogNode[]>([]); // 历史记录，保存EAOG的状态，用于撤销和重做操作
const currentEaogIndex = ref(-1); // 当前历史记录索引
const addToHistory = () => {
  // 清除当前索引之后的历史记录
  historyEaogData.splice(currentEaogIndex.value + 1);
  // 添加当前状态到历史记录
  const node = eaogData.value;
  if (historyEaogData.slice(-1)[0] && JSON.stringify(historyEaogData.slice(-1)[0]) === JSON.stringify(node)) {
    // 如果最后一个历史记录与当前节点相同，则不添加
    return;
  }
  historyEaogData.push(cloneDeepEaogNode(node));
  currentEaogIndex.value = historyEaogData.length - 1; // 更新当前索引
};

const undoFromHistory = () => {
  // 从历史记录中弹出最后一个状态
  if (currentEaogIndex.value < 0) return;
  currentEaogIndex.value--;
  eaogData.value = cloneDeepEaogNode(historyEaogData[currentEaogIndex.value]);
};

const redoFromHistory = () => {
  // 从历史记录中弹出下一个状态
  if (currentEaogIndex.value >= historyEaogData.length - 1) return; // 如果已经是最后一个历史记录，则不操作
  currentEaogIndex.value++;
  eaogData.value = cloneDeepEaogNode(historyEaogData[currentEaogIndex.value]);
};

// 处理节点操作函数
const handleNewNode = (position: 'before' | 'after' | 'child' | 'parent') => {
  // 在这里实现新建节点的逻辑
  debug('新建节点', position, contextMenuNode.value);
  eaogNodeForm.value?.open({
    node: contextMenuNode.value,
    onSuccess: (newNode: EaogNode) => {
      // 插入新节点到eaogData中
      insertNode(eaogData.value, contextMenuNode.value, newNode, position);
      addToHistory(); // 添加当前状态到历史记录
    }
  });
};

const handleEditNode = () => {
  debug('编辑节点', contextMenuNode.value);
  eaogNodeForm.value?.open({
    node: contextMenuNode.value,
    onSuccess: (updatedNode: EaogNode) => {
      // 更新eaogData中的节点
      if (contextMenuNode.value) {
        Object.assign(contextMenuNode.value, updatedNode);
        addToHistory(); // 添加当前状态到历史记录
      }
    }
  });
};

const handleCopyNode = (withChildren: boolean) => {
  // 在这里实现复制节点的逻辑
  if (contextMenuNode.value) {
    // 深拷贝节点，如果不复制子树，则清除children属性
    const nodeCopy = cloneDeepEaogNode(contextMenuNode.value);
    if (!withChildren && nodeCopy.children) {
      nodeCopy.children = []; // 清除子节点
    }
    clipboardNode.value = nodeCopy;
    clipboardWithChildren.value = withChildren;
    debug('复制节点', withChildren ? '包含子树' : '仅节点', nodeCopy);
  }
};

const handlePasteNode = (position: 'before' | 'after' | 'child' | 'parent') => {
  // 在这里实现粘贴节点的逻辑
  debug('粘贴节点', position, clipboardNode.value);
  if (!clipboardNode.value || !contextMenuNode.value) return;
  insertNode(eaogData.value, contextMenuNode.value, clipboardNode.value, position);
  addToHistory(); // 添加当前状态到历史记录
};

const handleDeleteNode = (deleteSubtree: boolean) => {
  // 在这里实现删除节点的逻辑
  debug('删除节点', deleteSubtree ? '包含子树' : '仅节点', contextMenuNode.value);
  if (!contextMenuNode.value) return;
  removeNode(eaogData.value, contextMenuNode.value, deleteSubtree);
  addToHistory(); // 添加当前状态到历史记录
};

// 工具栏操作处理函数

const handleRefresh = () => {
  debug('刷新当前视图');
  // 这里可以重新加载或刷新数据
  // eaogData.value = cloneDeepEaogNode(complexFlow);
};

const handleExport = () => {
  debug('导出当前EAOG');
  // 导出EAOG数据，例如下载JSON文件
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(eaogData.value, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "eaog-export.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

const handleReport = () => {
  debug('生成报告');
  // TODO: 实现报告生成功能
};

const handleControl = () => {
  debug('打开控制面板');
  // TODO: 实现控制面板功能
};

onMounted(() => {
  // 初始化时设置eaogData
  eaogData.value = complexFlow;
  addToHistory(); // 添加初始状态到历史记录
  // window.eaogData = eaogData; // 方便调试时在浏览器控制台查看
  // window.cloneDeepEaogNode = cloneDeepEaogNode
  debug('CP编辑器已加载，初始EAOG数据:', eaogData.value);
});

</script>

<template>
  <div class="cp-editor">
    <!-- 工具栏 -->
    <EditorToolbar
      :is-undo-available="currentEaogIndex > 0"
      :is-redo-available="currentEaogIndex < historyEaogData.length - 1"
      @undo="undoFromHistory"
      @redo="redoFromHistory"
      @refresh="handleRefresh"
      @export="handleExport"
      @report="handleReport"
      @control="handleControl"
    />

    <div class="flex p-4">
      <!-- 上下文菜单组件 -->
      <EaogContextMenu
        :context-menu-node="contextMenuNode"
        :clipboard-node="clipboardNode"
        @new-node="handleNewNode"
        @edit-node="handleEditNode"
        @copy-node="handleCopyNode"
        @paste-node="handlePasteNode"
        @delete-node="handleDeleteNode"
      >
        <!-- EAOG可视化区域 -->
        <div class="w-2/3 p-4 border rounded-md">
          <h2 class="text-lg font-semibold mb-2">EAOG可视化</h2>
          <div v-if="eaogData" class="eaog-container">
            <EaogNodeComponent
              :node="eaogData"
              :is-selected="selectedNode === eaogData"
              @node-click="handleNodeClick"
              @contextmenu="handleContextMenu"
            />
          </div>
        </div>
      </EaogContextMenu>


      <!-- 节点详情区域 -->
      <div class="w-1/3 ml-4 p-4 border rounded-md">
        <h2 class="text-lg font-semibold mb-2">节点详情</h2>
        <div v-if="selectedNode" class="node-details">
          <div class="mb-2">
            <span class="font-medium">名称：</span>
            <span>{{ selectedNode.name }}</span>
          </div>
          <div class="mb-2">
            <span class="font-medium">类型：</span>
            <span>{{ selectedNode.type }}</span>
          </div>
          <div class="mb-2" v-if="selectedNode.description">
            <span class="font-medium">描述：</span>
            <span>{{ selectedNode.description }}</span>
          </div>
        </div>
        <div v-else class="text-gray-500">
          请点击左侧节点查看详情
        </div>
      </div>
    </div>
    <!-- 节点属性编辑器弹窗 -->
    <EaogNodeForm ref="eaogNodeForm"/>
  </div>
</template>

<style scoped>
.eaog-container {
  overflow: auto;
  max-height: 80vh;
}

.node-details {
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 0.25rem;
}
</style>
