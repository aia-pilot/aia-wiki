<script setup lang="ts">
/**
 * EAOG节点尾部工具栏组件
 * 提供节点相关的功能按钮，如折叠/展开、同步点、钩子、子CP等
 */
import EditorToolbarButton from './editor-toolbar-button.vue';
import { EditableEaogNode } from '../../models/editable-eaog-node';
import { EaogFramework } from '../../models/eaog-framework';
import Debug from 'debug';
import {loadSideCpEaog} from "#/views/cp/models/cp-editor-state";

const debug = Debug('aia:eaog-node-tailbar');

const props = defineProps<{
  node: EditableEaogNode;
}>();

// 处理折叠/展开按钮点击
const toggleCollapse = () => {
  props.node.toggleCollapse();
  debug(`Node ${props.node.name} ${props.node.isCollapsed ? 'collapsed' : 'expanded'}`);
};

// 创建同步点
const createSyncPoint = () => {
  debug(`Creating sync point for node: ${props.node.name}`);
  // TODO: 实现创建同步点逻辑
};

// 添加钩子
const addHook = () => {
  debug(`Adding hook for node: ${props.node.name}`);
  // TODO: 实现添加钩子逻辑
};

// 添加子CP
const addChildCP = () => {
  debug(`Adding child CP for node: ${props.node.name}`);
  // TODO: 实现添加子CP逻辑
};

// 判断当前节点是否显示同步点按钮
const shouldShowSyncPointButton = () => {
  // 例如：只对特定类型的节点显示同步点按钮
  return ['seq', 'par', 'cor'].includes(props.node.type);
};

// 判断当前节点是否显示钩子按钮
const shouldShowHookButton = () => {
  // 根据需求判断显示条件
  return true;
};

</script>

<template>
  <div class="eaog-node-tailbar flex items-center">
    <!-- 折叠/展开按钮 -->
    <EditorToolbarButton
      v-if="node.children && node.children.length > 0"
      :icon="node.isFramework && node.meta?.icon ? node.meta.icon : (node.isCollapsed ? 'ant-design:down-outlined' : 'ant-design:up-outlined')"
      :tooltip="node.isCollapsed ? '展开子节点' : '折叠子节点'"
      @click.stop="toggleCollapse"
      class="text-blue-500 opacity-100"
      :class="{ 'opacity-0 group-hover:opacity-100': !node.isCollapsed }"
    />

    <!-- 同步点按钮 -->
    <EditorToolbarButton
      v-if="shouldShowSyncPointButton()"
      icon="mdi:sync-circle"
      tooltip="创建同步点"
      @click.stop="createSyncPoint"
      class="opacity-0 group-hover:opacity-100"
    />

    <!-- 钩子按钮 -->
    <EditorToolbarButton
      v-if="shouldShowHookButton()"
      icon="mdi:hook"
      tooltip="添加钩子"
      @click.stop="addHook"
      class="opacity-0 group-hover:opacity-100"
    />

    <!-- 子CP按钮 -->
    <EditorToolbarButton
      v-if="node.sideCP"
      icon="mdi:source-branch"
      tooltip="添加子CP"
      @click.stop="loadSideCpEaog(node.sideCP)"
      class="opacity-0 group-hover:opacity-100"
    />
  </div>
</template>

<style scoped>
.eaog-node-tailbar {
  transition: opacity 0.3s ease-in-out;
}
</style>
