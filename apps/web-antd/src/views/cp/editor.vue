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
import {loadCurrentCP, currentPane, currentCP, mainCP, parallelCP} from "#/views/cp/models/cp-editor-state";
import EaogNodeComponent from './components/editor/eaog-node.vue';
import EaogContextMenu from './components/editor/editor-context-menu.vue';
import EditorToolbar from './components/editor/editor-toolbar.vue';
import EditorSidebar from './components/editor-sidebar/editor-sidebar.vue';
import MainSideEaogLinks from './components/editor/main-parallel-eaog-links.vue'; // 导入主辅EAOG关联线层组件
import {complexFlow} from './eaog-samples';
import {onMounted, ref, provide, type Ref, nextTick, watch} from 'vue';

import EaogNodeForm from "#/views/cp/components/editor/eaog-node-form.vue";
import {Splitpanes, Pane} from "splitpanes"
import 'splitpanes/dist/splitpanes.css'

import Debug from 'debug';

const debug = Debug('aia:cp-editor');

const eaogNodeForm = ref<InstanceType<typeof EaogNodeForm>>();
provide<Ref<InstanceType<typeof EaogNodeForm> | undefined>>('eaogNodeForm', eaogNodeForm);

currentPane.value = 'eaog-tree'; // 当前工作面板，默认为节点详情

// 编辑器容器引用
const editorContainer = ref<HTMLDivElement>();

onMounted(async () => {
  await loadCurrentCP({eaog: complexFlow}); // 加载示例流程数据
  debug('CP编辑器已加载，初始EAOG数据:', currentCP.value);
});

const parallelCPDomReady = ref(false); // 并行CP DOM是否准备就绪
watch(parallelCP, (newValue) => setTimeout(() => {
  parallelCPDomReady.value = !!newValue; // 确保DOM准备就绪
  debug('并行CP DOM状态:', parallelCPDomReady.value);
}));
</script>

<template>
  <div class="cp-editor" ref="editorContainer">
    <!-- 工具栏 -->
    <EditorToolbar/>

    <!-- Eaog工作区（Eaog树、节点详情、上下文菜单） -->
    <!-- 上下文菜单组件 -->
    <Splitpanes class="flex p-4 w-full h-full default-theme eaog-panes" :gutter-size="5" :min-pane-size="100">
      <EaogContextMenu :shortCutDisabled="currentPane !== 'eaog-tree'">
        <!-- 主CP EAOG -->
        <template #main-eaog>
          <Pane :size="parallelCP ? 40 : 80">
            <div class="w-full p-4 border rounded-md">
              <div v-if="mainCP" class="eaog-tree main-eaog" @click="currentPane = 'main-eaog'">
                <EaogNodeComponent :node="mainCP.eaog" :key="mainCP.eaog.id"/>
              </div>
            </div>
          </Pane>
        </template>

        <!-- 并行CP EAOG 展示将与主CP并行执行的某个CP -->
        <template v-if="parallelCP" #parallel-eaog>
          <Pane :size="40">
            <div class="w-full p-4 border rounded-md">
              <div class="eaog-tree parallel-eaog" @click="currentPane = 'parallel-eaog'">
                <EaogNodeComponent :node="parallelCP.eaog" :key="parallelCP.eaog.id"/>
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
    <MainSideEaogLinks v-if="parallelCPDomReady" :container="editorContainer"/>

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
