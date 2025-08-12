<script setup lang="ts">
/**
 * # CP(eaog) 编辑器
 *
 * 1. `属性编辑器`弹出窗，支持新建、编辑节点
 * 2. 支持复制、粘贴、删除节点
 * 3. 新建、粘贴时，可选择插入位置：前（兄弟节点、前）、后（兄弟节点、后）、子（作为子节点，仅对容器节点）、父（仅当添加、粘贴的节点为容器节点时）
 * 4. 复制时，可选择是否复制子树
 * 5. 删除时，可选择是否删除子树，如不删除子树，将孩子节点提升为当前节点的兄弟节点
 * 6. 项目管理：在右侧面板提供项目文件浏览器
 *
 * ## 开发惯例
 * 1. 尽量使用tailwindcss的类名来控制样式，保持一致性和可维护性。
 */

// 导入EaogNode组件和相关类型
import {ContextMenuTrigger} from '@vben-core/shadcn-ui';
import {loadCurrentCP, currentPane, currentCP, mainCP, parallelCPs} from "#/views/cp/viewmodels/cp-editor-state";
import EaogNodeComponent from './components/editor/eaog-node.vue';
import EaogContextMenu from './components/editor/editor-context-menu.vue';
import EditorToolbar from './components/editor/editor-toolbar.vue';
import EditorSidebar from './components/editor-sidebar/editor-sidebar.vue';
import MainSideEaogLinks from './components/editor/main-parallel-eaog-links.vue'; // 导入主辅EAOG关联线层组件
import {complexFlow} from './eaog-samples';
import {onMounted, ref, provide, type Ref, computed} from 'vue';

import EaogNodeForm from "#/views/cp/components/editor/eaog-node-form.vue";
import 'splitpanes/dist/splitpanes.css'

import Debug from 'debug';
import ThreePanes from "#/views/cp/components/editor/three-panes.vue";

const debug = Debug('aia:cp-editor');

const eaogNodeForm = ref<InstanceType<typeof EaogNodeForm>>();
provide<Ref<InstanceType<typeof EaogNodeForm> | undefined>>('eaogNodeForm', eaogNodeForm);

currentPane.value = 'eaog-tree'; // 当前工作面板，默认为节点详情

// 编辑器容器引用
const editorContainer = ref<HTMLDivElement>();
const showParallel = computed(() => parallelCPs.value.length > 0);

onMounted(async () => {
  await loadCurrentCP({eaog: complexFlow}); // 加载示例流程数据
  debug('CP编辑器已加载，初始EAOG数据:', currentCP.value);
});

</script>

<template>
  <div class="cp-editor w-full h-full" ref="editorContainer">
    <!-- 工具栏 -->
    <EditorToolbar/>
    <EaogContextMenu>
      <three-panes :show-parallel="showParallel" ref="threePanes" class="flex w-full h-full">
        <!-- 主CP EAOG -->
        <template #main>
          <ContextMenuTrigger asChild>
            <div class="w-full p-4 border rounded-md">
              <div v-if="mainCP" class="eaog-tree main-eaog" @click="currentPane = 'main-eaog'">
                <EaogNodeComponent :node="mainCP.eaog" :key="mainCP.eaog.id"/>
              </div>
            </div>
          </ContextMenuTrigger>
        </template>

        <!-- 并行CP EAOG -->
        <template #parallel>
          <ContextMenuTrigger asChild>
            <div class="w-full p-4 border rounded-md">
              <div v-for="sideCP in parallelCPs" :key="sideCP.waiterCP!.id" class="eaog-tree parallel-eaog"
                   @click="currentPane = 'parallel-eaog'">
                <EaogNodeComponent :node="sideCP.waiterCP!.eaog" :key="sideCP.waiterCP!.eaog.id"/>
              </div>
            </div>
          </ContextMenuTrigger>
        </template>

        <!-- 右侧栏 -->
        <template #sidebar>
            <EditorSidebar />
        </template>
      </three-panes>
    </EaogContextMenu>

    <!-- 主EAOG与辅EAOG关联线层 -->
    <MainSideEaogLinks v-if="showParallel" :container="editorContainer"/>

    <!-- 节点属性编辑器弹窗 -->
    <EaogNodeForm ref="eaogNodeForm"/>
  </div>
</template>

<style scoped>
.eaog-tree {
  overflow: auto;
  max-height: 80vh;
}
</style>
