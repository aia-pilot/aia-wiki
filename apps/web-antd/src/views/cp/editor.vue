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
import EaogNodeComponent from './components/editor/eaog-node.vue';
import EaogContextMenu from './components/editor/editor-context-menu.vue';
import EditorToolbar from './components/editor/editor-toolbar.vue';
import EditorSidebar from './components/editor-sidebar/editor-sidebar.vue';
import {currentEaog, loadCurrentEaog} from './models/editable-eaog-node';
import {complexFlow} from './eaog-samples';
import {onMounted, ref, provide, type Ref} from 'vue';

import EaogNodeForm from "#/views/cp/components/editor/eaog-node-form.vue";

import Debug from 'debug';

const debug = Debug('aia:cp-editor');

const eaogNodeForm = ref<InstanceType<typeof EaogNodeForm>>();
provide<Ref<InstanceType<typeof EaogNodeForm> | undefined>>('eaogNodeForm', eaogNodeForm);

const currentWorkPanel = ref('eaog-tree'); // 当前工作面板，默认为节点详情
const changeCurrentWorkPanel = (panel: string) => {
  currentWorkPanel.value = panel;
  debug('切换工作面板:', panel);
};

onMounted(async () => {
  await loadCurrentEaog(complexFlow); // 加载示例流程数据
  debug('CP编辑器已加载，初始EAOG数据:', currentEaog.value);
});
</script>

<template>
  <div class="cp-editor">
    <!-- 工具栏 -->
    <EditorToolbar />

    <!-- Eaog工作区（Eaog树、节点详情、上下文菜单） -->
    <div class="flex p-4">
      <!-- 上下文菜单组件 -->
      <EaogContextMenu :shortCutDisabled="currentWorkPanel !== 'eaog-tree'">
        <!-- EAOG可视化区域 -->
        <div class="w-2/3 p-4 border rounded-md">
          <div v-if="currentEaog" class="eaog-tree" @click="changeCurrentWorkPanel('eaog-tree')">
            <EaogNodeComponent :node="currentEaog" />
          </div>
        </div>
      </EaogContextMenu>

      <!-- 右侧栏组件 -->
      <div class="w-1/3 ml-4 editor-sidebar" @click="changeCurrentWorkPanel('editor-sidebar')">
        <EditorSidebar />
      </div>
    </div>

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
