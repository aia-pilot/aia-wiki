<script setup lang="ts">
/**
 * CP编辑器右侧栏组件
 * 包含节点详情、项目面板、本地目录 3个标签页
 */
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@vben-core/shadcn-ui';
import NodeDetailsPanel from './node-details-panel.vue';
import ProjectPanel from './project-panel.vue';
import LocalDirPanel from '#/views/cp/components/editor-sidebar/local-dir-panel.vue';
import CpPanel from './cp-panel.vue';
import { watchEffect } from "vue";

import Debug from 'debug';
import {projectManager} from "#/views/cp/components/editor-sidebar/project";
import {saveCpToFile} from "#/views/cp/components/editor-sidebar/local-dir";
import {currentTab, cpSaver} from "#/views/cp/viewmodels/cp-editor-state";
// @ts-ignore
const debug = Debug('aia:cp:editor-sidebar');


watchEffect(() => { // 替换为watchEffect，确保初始化时执行一次
  const newTab = currentTab.value;
  debug('设置保存函数，当前标签页:', newTab);
  cpSaver.value = newTab === 'project-panel'    ?   projectManager.updateOrCreateFile.bind(projectManager)
                : newTab === 'local-dir-panel'  ?   saveCpToFile
                : cpSaver.value; // 保留现有的保存函数，而非设为null
});

</script>

<template>
  <div class="w-full h-full p-4 border rounded-md">
    <Tabs v-model="currentTab">
      <TabsList>
        <TabsTrigger value="node-details">节点详情</TabsTrigger>
        <TabsTrigger value="project-panel">项目面板</TabsTrigger>
        <TabsTrigger value="local-dir-panel">本地目录</TabsTrigger>
        <TabsTrigger value="cp-panel">CP面板</TabsTrigger>
      </TabsList>

      <!-- 节点详情面板 -->
      <TabsContent value="node-details" class="pt-4">
        <NodeDetailsPanel />
      </TabsContent>

      <!-- 项目面板 -->
      <TabsContent value="project-panel" class="pt-4">
        <ProjectPanel />
      </TabsContent>

      <!-- 本地目录面板 -->
      <TabsContent value="local-dir-panel" class="pt-4">
        <LocalDirPanel />
      </TabsContent>

      <!-- CP面板 -->
      <TabsContent value="cp-panel" class="pt-4">
        <CpPanel />
      </TabsContent>
    </Tabs>
  </div>
</template>

<style scoped>
/* 无需特定样式，样式已在各组件中定义 */
</style>
