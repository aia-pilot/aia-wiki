<script setup lang="ts">
/**
 * 节点详情面板
 * 显示当前选中节点的详细信息
 */
import {JsonViewer} from '@vben/common-ui';
import {currentNode} from '../../viewmodels/cp-editor-state';
</script>

<template>
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
</template>

<style scoped>
.node-details {
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 0.25rem;
}
</style>
