<script setup lang="ts">
/**
 * CP编辑器右侧栏组件
 * 包含节点详情、项目面板、本地目录 3个标签页
 */
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@vben-core/shadcn-ui';
import {IS_STANDALONE_APP} from "#/utils/aia-constants";
import NodeDetailsPanel from './node-details-panel.vue';
import ProjectPanel from './project-panel.vue';
import LocalDirPanel from '#/views/cp/components/editor-sidebar/local-dir-panel.vue';
import CpPanel from './cp-panel.vue';

import Debug from 'debug';
import {onMounted, watch} from "vue";
import {projectManager} from "#/views/cp/components/editor-sidebar/project";
import {saveCpToFile} from "#/views/cp/components/editor-sidebar/local-dir";
import {currentTab, cpSaver} from "#/views/cp/viewmodel/cp-editor-state";
// @ts-ignore
const debug = Debug('aia:cp:editor-sidebar');

watch(currentTab, (newTab) => {
  debug('切换标签页:', newTab);
  cpSaver.value = newTab === 'project-panel'    ?   projectManager.updateOrCreateFile.bind(projectManager)
                  : newTab === 'local-dir-panel'  ?   saveCpToFile
                  : null; // 清除保存函数
});

onMounted(() => {
  // 初始化时设置默认标签页
  currentTab.value = IS_STANDALONE_APP ? 'local-dir-panel' : 'project-panel';
  debug('Editor Sidebar已加载，当前标签页:', currentTab.value);
});

</script>

<template>
  <div class="w-full h-full p-4 border rounded-md">
    <Tabs v-model="currentTab">
      <TabsList>
        <TabsTrigger value="node-details">节点详情</TabsTrigger>
        <TabsTrigger value="project-panel">项目面板</TabsTrigger>
        <TabsTrigger v-if="IS_STANDALONE_APP" value="local-dir-panel">本地目录</TabsTrigger>
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
      <TabsContent v-if="IS_STANDALONE_APP" value="local-dir-panel" class="pt-4">
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
