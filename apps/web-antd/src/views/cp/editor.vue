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
  convertToEaogRoot,
  currentEaog,
  currentNode,
  updateCurrentEaog,
} from './models/eaog-node';
import {complexFlow, simpleSequentialFlow} from './eaog-samples';
import {onMounted, ref} from 'vue';

import EaogNodeForm from "#/views/cp/components/eaog-node-form.vue";
import { JsonViewer } from '@vben/common-ui';

import Debug from 'debug';
const debug = Debug('aia:cp-editor');

import {useHistory} from './composables/eaog-history';
const history = useHistory();

const eaogNodeForm = ref<InstanceType<typeof EaogNodeForm>>();

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
    <EditorToolbar :eaog-node-form="eaogNodeForm"/>

    <!-- Eaog工作区（Eaog树、节点详情、上下文菜单） -->
    <div class="flex p-4">
      <!-- 上下文菜单组件 -->
      <EaogContextMenu :eaog-node-form="eaogNodeForm">
        <!-- EAOG可视化区域 -->
        <div class="w-2/3 p-4 border rounded-md">
          <h2 class="text-lg font-semibold mb-2">EAOG可视化</h2>
          <div v-if="currentEaog" class="eaog-container">
            <EaogNodeComponent :node="currentEaog"/>
          </div>
        </div>
      </EaogContextMenu>

      <!-- 节点详情区域 -->
      <div class="w-1/3 ml-4 p-4 border rounded-md">
        <h2 class="text-lg font-semibold mb-2">节点详情</h2>
        <div v-if="currentNode" class="node-details">
          <div class="mb-4">
            <div class="mb-2">
              <span class="font-medium">名称：</span>
              <span>{{ currentNode.name }}</span>
            </div>
            <div class="mb-2">
              <span class="font-medium">类型：</span>
              <span>{{ currentNode.type }}</span>
            </div>
          </div>

          <!-- 使用JsonViewer展示完整节点信息 -->
          <div>
            <div class="font-medium mb-2">完整JSON数据：</div>
            <JsonViewer
              :value="currentNode"
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
