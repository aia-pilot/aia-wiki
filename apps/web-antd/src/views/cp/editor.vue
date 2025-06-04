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
import EaogContextMenu from './components/eaog-context-menu.vue';
import { type EaogNode } from './components/eaog-node';
import { complexFlow } from './eaog-samples';
import { ref } from 'vue';

// 当前选中的EAOG节点
const selectedNode = ref<EaogNode | null>(null);

// 保存当前右键点击的节点，可能与selectedNode不同
const contextMenuNode = ref<EaogNode | null>(null);

// 剪切板中的节点
const clipboardNode = ref<EaogNode | null>(null);
const clipboardWithChildren = ref(false);

// 示例EAOG流程
const eaogData = ref<EaogNode>(complexFlow);

// 处理节点点击事件
const handleNodeClick = (node: EaogNode) => {
  selectedNode.value = node;
};

// 处理节点右键点击事件，获取右键发生的节点
const handleContextMenu = (e: MouseEvent) => {
  contextMenuNode.value = e.eaogNode || null; // 从事件对象中获取当前节点
};

// 处理节点操作函数
const handleNewNode = (position: 'before' | 'after' | 'child' | 'parent') => {
  // 在这里实现新建节点的逻辑
  console.log('新建节点', position, contextMenuNode.value);
  // TODO: 打开属性编辑器弹窗，创建新节点
};

const handleEditNode = () => {
  // 在这里实现编辑节点的逻辑
  console.log('编辑节点', contextMenuNode.value);
  // TODO: 打开属性编辑器弹窗，编辑当前节点
};

const handleCopyNode = (withChildren: boolean) => {
  // 在这里实现复制节点的逻辑
  if (contextMenuNode.value) {
    // 深拷贝节点，如果不复制子树，则清除children属性
    const nodeCopy = JSON.parse(JSON.stringify(contextMenuNode.value));
    if (!withChildren && nodeCopy.children) {
      delete nodeCopy.children;
    }
    clipboardNode.value = nodeCopy;
    clipboardWithChildren.value = withChildren;
    console.log('复制节点', withChildren ? '包含子树' : '仅节点', nodeCopy);
  }
};

const handlePasteNode = (position: 'before' | 'after' | 'child' | 'parent') => {
  // 在这里实现粘贴节点的逻辑
  console.log('粘贴节点', position, clipboardNode.value);
  if (!clipboardNode.value || !contextMenuNode.value) return;

  // TODO: 实现粘贴节点的具体逻辑
  // 需要找到父节点，然后根据position插入到合适的位置
};

const handleDeleteNode = (deleteSubtree: boolean) => {
  // 在这里实现删除节点的逻辑
  console.log('删除节点', deleteSubtree ? '包含子树' : '仅节点', contextMenuNode.value);

  // TODO: 实现删除节点的具体逻辑
  // 如果deleteSubtree为false，需要将子节点提升为当前节点的兄弟节点
};

</script>

<template>
  <div class="cp-editor p-4">
    <h1 class="text-xl font-bold mb-4">CP编辑器</h1>

    <div class="flex">
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
          <div class="eaog-container">
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
