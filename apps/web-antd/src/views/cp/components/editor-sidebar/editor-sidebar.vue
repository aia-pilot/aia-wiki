<script setup lang="ts">
/**
 * CP编辑器右侧栏组件
 * 包含节点详情、项目面板、工作区 3个标签页
 */
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@vben-core/shadcn-ui';
import NodeDetailsPanel from './node-details-panel.vue';
import WorkspacePanel from '#/views/cp/components/editor-sidebar/workspace-panel.vue';
import CpPanel from './cp-panel.vue';

import Debug from 'debug';
import {currentTab} from "#/views/cp/viewmodels/cp-editor-state";
// @ts-ignore
const debug = Debug('aia:cp:editor-sidebar');

</script>

<template>
  <div class="w-full h-full p-4 border rounded-md">
    <Tabs v-model="currentTab">
      <TabsList>
        <TabsTrigger value="workspace-panel">工作区</TabsTrigger>
        <TabsTrigger value="cp-panel">CP面板</TabsTrigger>
        <TabsTrigger value="node-details">节点详情</TabsTrigger>
      </TabsList>

      <!-- 工作区面板 -->
      <TabsContent value="workspace-panel" class="pt-4">
        <WorkspacePanel />
      </TabsContent>

      <!-- CP面板 -->
      <TabsContent value="cp-panel" class="pt-4">
        <CpPanel />
      </TabsContent>

      <!-- 节点详情面板 -->
      <TabsContent value="node-details" class="pt-4">
        <NodeDetailsPanel />
      </TabsContent>
    </Tabs>
  </div>
</template>

<style scoped>
/* 无需特定样式，样式已在各组件中定义 */
</style>
