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
import {loadCurrentEaog, currentPane, currentEaog, mainEaog, sideEaog} from "#/views/cp/models/cp-editor-state";
import EaogNodeComponent from './components/editor/eaog-node.vue';
import EaogContextMenu from './components/editor/editor-context-menu.vue';
import EditorToolbar from './components/editor/editor-toolbar.vue';
import EditorSidebar from './components/editor-sidebar/editor-sidebar.vue';
import MainSideEaogLinks from './components/main-side-eaog-links.vue'; // 导入主辅EAOG关联线层组件
import {complexFlow} from './eaog-samples';
import {onMounted, ref, provide, type Ref} from 'vue';

import EaogNodeForm from "#/views/cp/components/editor/eaog-node-form.vue";
import {Splitpanes, Pane} from "splitpanes"
import 'splitpanes/dist/splitpanes.css'

import Debug from 'debug';

const debug = Debug('aia:cp-editor');

const eaogNodeForm = ref<InstanceType<typeof EaogNodeForm>>();
provide<Ref<InstanceType<typeof EaogNodeForm> | undefined>>('eaogNodeForm', eaogNodeForm);

currentPane.value = 'eaog-tree'; // 当前工作面板，默认为节点详情
const changeCurrentWorkPane = (pane: string) => {
  currentPane.value = pane;
  debug('切换工作面板:', pane);
};

// 编辑器容器引用
const editorContainer = ref<HTMLDivElement>();

onMounted(async () => {
  await loadCurrentEaog(complexFlow); // 加载示例流程数据
  debug('CP编辑器已加载，初始EAOG数据:', currentEaog.value);
});
</script>

<template>
  <div class="cp-editor" ref="editorContainer">
    <!-- 工具栏 -->
    <EditorToolbar/>

    <!-- Eaog工作区（Eaog树、节点详情、上下文菜单） -->
    <!-- 上下文菜单组件 -->
    <Splitpanes class="flex p-4 w-full h-full default-theme" :gutter-size="5" :min-pane-size="100">
      <EaogContextMenu :shortCutDisabled="currentPane !== 'eaog-tree'">
        <!-- 主EAOG -->
        <template #main-eaog>
          <Pane :size="sideEaog ? 40 : 80">
            <div class="w-full p-4 border rounded-md">
              <div v-if="mainEaog" class="eaog-tree main-eaog" @click="currentPane = 'main-eaog'">
                <EaogNodeComponent :node="mainEaog"/>
              </div>
            </div>
          </Pane>
        </template>

        <!-- 辅EAOG -->
        <template v-if="sideEaog"  #side-eaog>
          <Pane :size="40">
            <div class="w-full p-4 border rounded-md">
              <div class="eaog-tree side-eaog" @click="currentPane = 'side-eaog'">
                <EaogNodeComponent :node="sideEaog"/>
              </div>
            </div>
          </Pane>
        </template>
      </EaogContextMenu>

      <!-- 右侧栏组件 -->
      <Pane :size="20">
        <div class="w-full editor-sidebar" @click="currentPane = 'editor-sidebar'">
          <EditorSidebar/>
        </div>
      </Pane>

    </Splitpanes>

    <!-- 主EAOG与辅EAOG关联线层 -->
    <MainSideEaogLinks v-if="mainEaog && sideEaog" :containerRef="editorContainer"/>

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
