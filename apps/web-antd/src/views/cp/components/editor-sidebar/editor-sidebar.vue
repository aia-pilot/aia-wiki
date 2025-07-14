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

import Debug from 'debug';
import {onMounted, ref, watch} from "vue";
import {type EaogNode, eaogSaver, loadCurrentEaog} from "#/views/cp/models/editable-eaog-node";
import {projectManager} from "#/views/cp/models/project";
// import {projectManager} from "#/views/cp/models/project";

const debug = Debug('aia:cp:editor-sidebar');

// 当前标签页
const currentTab = ref<string | null>(null);

watch(currentTab, (newTab) => {
  debug('切换标签页:', newTab);
  if (newTab === 'project-panel') {
    eaogSaver.value = async (eaog: EaogNode, isNew: boolean) => {
      debug('保存EAOG到项目面板:', eaog, isNew);
      await projectManager.updateOrCreateFile(eaog, isNew);
    };
  }
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
    </Tabs>
  </div>
</template>

<style scoped>
/* 无需特定样式，样式已在各组件中定义 */
</style>
