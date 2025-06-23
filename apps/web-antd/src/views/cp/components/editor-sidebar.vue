<script setup lang="ts">
/**
 * CP编辑器右侧栏组件
 * 包含节点详情和项目面板两个标签页
 */
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@vben-core/shadcn-ui';

import NodeDetailsPanel from './node-details-panel.vue';
import ProjectPanel from './project-panel.vue';
import {inject} from 'vue';

import Debug from 'debug';

const debug = Debug('aia:cp:editor-sidebar');

// 当前标签页
const defaultValue = 'node-details';
</script>

<template>
  <div class="w-full h-full p-4 border rounded-md">
    <Tabs :default-value="defaultValue">
      <TabsList>
        <TabsTrigger value="node-details">节点详情</TabsTrigger>
        <TabsTrigger value="project-panel">项目面板</TabsTrigger>
      </TabsList>

      <!-- 节点详情面板 -->
      <TabsContent value="node-details" class="pt-4">
        <NodeDetailsPanel />
      </TabsContent>

      <!-- 项目面板 -->
      <TabsContent value="project-panel" class="pt-4">
        <ProjectPanel />
      </TabsContent>
    </Tabs>
  </div>
</template>

<style scoped>
/* 无需特定样式，样式已在各组件中定义 */
</style>
