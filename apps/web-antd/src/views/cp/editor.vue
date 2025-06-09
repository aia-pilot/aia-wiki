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
import {EditableEaogNode, convertToEaogRoot} from './components/eaog-node';
import {complexFlow, simpleSequentialFlow} from './eaog-samples';
import {onMounted, type Ref, ref} from 'vue';

import {Eaog} from "../../../../../../aia-eaog/src/eaog.js";
import EaogNodeForm from "#/views/cp/components/eaog-node-form.vue";
import { JsonViewer } from '@vben/common-ui';
import { useHistory } from './composables/useHistory';

const eaogNodeForm = ref<InstanceType<typeof EaogNodeForm>>();

import Debug from 'debug';

const debug = Debug('aia:cp-editor');

// 当前点击的EAOG节点
const clickedNode = ref<EditableEaogNode | null>(null);

// 当前选中的EAOG节点集
const selectedNodes : {node: EditableEaogNode, isSelectedRef: Ref<boolean>}[] = [];

// 上下文菜单的引用
const contextMenuRef = ref<InstanceType<typeof EaogContextMenu>>();

// 示例EAOG流程
const currentEaog = ref<EditableEaogNode | null>(null);

// 使用历史记录管理 composable
const history = useHistory();

// 处理节点点击事件
const handleNodeClick = (node: EditableEaogNode, event: Event, isSelectedRef) => {
  clickedNode.value = node;

  // 处理选中逻��，Shift键支持多选
  if (selectedNodes.some(item => item.node === node)) { // 如果已经选中，则取消选中
    selectedNodes.splice(selectedNodes.findIndex(item => item.node === node), 1);
    isSelectedRef.value = false;
  } else { // 否则，添加到选中列表
    selectedNodes.push({node, isSelectedRef});
    isSelectedRef.value = true;
  }
  // 没有按下Shift键时，清除其他选中
  if (!event.shiftKey) {
    selectedNodes.forEach(item => {
      if (item.node !== node) {
        item.isSelectedRef.value = false;
      }
    });
    selectedNodes.splice(0, selectedNodes.length, {node, isSelectedRef});
  }
};

// 处理节点右键点击事件，获取右键发生EaogNde节点，传递给上下文菜单
const handleContextMenu = (e: MouseEvent) => {
  const eaogNode = (e as any).eaogNode || null; // 从事件对象中获取当前节点
  contextMenuRef.value?.setContextMenuNode(eaogNode);
};

/**
 * 工具栏、上下文Eaog更新处理函数
 * @param newCurrentEaog - 新的当前Eaog节点, 为undefined时表示不改动当前Eaog对象，但其属性（含子节点）已被修改。
 */
const updateCurrentEaog = (newCurrentEaog: EditableEaogNode | undefined) => {
  // newCurrentEaog && (currentEaog.value = Eaog.create(newCurrentEaog)); // 注意：Editor中不用create为可执行的Eaog对象。不过，我们已经证实，可以用Eaog.create的实例，来响应式的更新可视化树。这个技术可以用在调试界面。
  newCurrentEaog && (currentEaog.value = newCurrentEaog);
  debug('更新Eaog:', newCurrentEaog);
};

onMounted(() => {
  // 初始化时设置eaogData
  const initialEaog = convertToEaogRoot(complexFlow); // 使用示例流程并转换为EditableEaogNode
  updateCurrentEaog(initialEaog);
  history.initHistory(initialEaog);
  debug('CP编辑器已加载，初始EAOG数据:', currentEaog.value);
});
</script>

<template>
  <div class="cp-editor">
    <!-- 工具栏 -->
    <EditorToolbar
      :eaog-data="currentEaog"
      :selected-nodes="selectedNodes"
      @update-eaog="updateCurrentEaog"
    />

    <!-- Eaog工作区（Eaog树、节点详情、上下文菜单） -->
    <div class="flex p-4">
      <!-- 上下文菜单组件 -->
      <EaogContextMenu
        ref="contextMenuRef"
        :eaog-data="currentEaog"
        :eaog-node-form="eaogNodeForm"
        @add-history="history.addToHistory(currentEaog)"
      >
        <!-- EAOG可视化区域 -->
        <div class="w-2/3 p-4 border rounded-md">
          <h2 class="text-lg font-semibold mb-2">EAOG可视化</h2>
          <div v-if="currentEaog" class="eaog-container">
            <EaogNodeComponent
              :node="currentEaog"
              @node-click="handleNodeClick"
              @contextmenu="handleContextMenu"
            />
          </div>
        </div>
      </EaogContextMenu>

      <!-- 节点详情区域 -->
      <div class="w-1/3 ml-4 p-4 border rounded-md">
        <h2 class="text-lg font-semibold mb-2">节点详情</h2>
        <div v-if="clickedNode" class="node-details">
          <div class="mb-4">
            <div class="mb-2">
              <span class="font-medium">名称：</span>
              <span>{{ clickedNode.name }}</span>
            </div>
            <div class="mb-2">
              <span class="font-medium">类型：</span>
              <span>{{ clickedNode.type }}</span>
            </div>
          </div>

          <!-- 使用JsonViewer展示完整节点信息 -->
          <div>
            <div class="font-medium mb-2">完整JSON数据：</div>
            <JsonViewer
              :value="clickedNode"
              :expand-depth="2"
              copyable
              boxed
            />
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
