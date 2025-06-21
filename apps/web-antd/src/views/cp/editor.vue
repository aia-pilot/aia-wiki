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
import EaogNodeComponent from './components/eaog-node.vue';
import EaogContextMenu from './components/editor-context-menu.vue';
import EditorToolbar from './components/editor-toolbar.vue';
import EditorSidebar from './components/editor-sidebar.vue';
import {
  convertToEaogRoot,
  currentEaog,
  updateCurrentEaog,
} from './models/editable-eaog-node';
import {complexFlow, simpleSequentialFlow} from './eaog-samples';
import {onMounted, ref} from 'vue';

import EaogNodeForm from "#/views/cp/components/eaog-node-form.vue";
import {projectManager} from './models/project';

import Debug from 'debug';

const debug = Debug('aia:cp-editor');

import {useHistory} from './composables/use-eaog-history';

const history = useHistory();

const eaogNodeForm = ref<InstanceType<typeof EaogNodeForm>>();

// 处理从项目面板加载文件的事件
const handleLoadFile = (fileContent) => {
  const data = JSON.parse(fileContent);
  const eaogData = convertToEaogRoot(data);
  updateCurrentEaog(eaogData);
  history.initHistory(eaogData);
};

onMounted(async () => {
  // 初始化时设置eaogData
  const initialEaog = convertToEaogRoot(complexFlow); // 使用示例流程并转换为EditableEaogNode
  updateCurrentEaog(initialEaog);
  history.initHistory(initialEaog);
  debug('CP编辑器已加载，初始EAOG数据:', currentEaog.value);

// 初始化项目数据
  await projectManager.initDB();
  await projectManager.createDefaultProject();
  await projectManager.loadProjectFiles();
});
</script>

<template>
  <div class="cp-editor">
    <!-- 工具栏 -->
    <EditorToolbar :eaog-node-form="eaogNodeForm"/>

    <!-- Eaog工作区（Eaog树、节点详情、上下文菜单） -->
    <div class="flex p-4">
      <!-- 上下文菜单组件 -->
      <EaogContextMenu :eaog-node-form="eaogNodeForm">
        <!-- EAOG可视化区域 -->
        <div class="w-2/3 p-4 border rounded-md">
          <div v-if="currentEaog" class="eaog-container">
            <EaogNodeComponent :node="currentEaog" :eaog-node-form="eaogNodeForm"/>
          </div>
        </div>
      </EaogContextMenu>

      <!-- 右侧栏组件 -->
      <div class="w-1/3 ml-4">
        <EditorSidebar :eaog-node-form="eaogNodeForm" @load-file="handleLoadFile"/>
      </div>
    </div>

    <!-- 节点属性编辑器弹窗 -->
    <EaogNodeForm ref="eaogNodeForm"/>
  </div>
</template>

<style scoped>
.eaog-container {
  overflow: auto;
  max-height: 80vh;
}
</style>
