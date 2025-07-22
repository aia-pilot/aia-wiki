<script setup lang="ts">
/**
 * EAOG节点尾部工具栏组件
 * 提供节点相关的功能按钮，如折叠/展开、同步点、钩子、子CP等
 */
import EditorToolbarButton from './editor-toolbar-button.vue';
import {EditableEaogNode} from '../../models/editable-eaog-node';
import {EaogFramework} from '../../models/eaog-framework';
import Debug from 'debug';
import {loadParallelCP} from "#/views/cp/models/cp-editor-state";
import {NestedCPType} from "#/views/cp/models/nested-cp";
import { computed } from 'vue';

const debug = Debug('aia:eaog-node-tailbar');

const props = defineProps<{
  node: EditableEaogNode;
  isReplacedByNestedCP?: boolean; // 是否为嵌套CP节点
}>();

// 处理折叠/展开按钮点击
const toggleCollapse = () => {
  props.node.toggleCollapse();
  debug(`Node ${props.node.name} ${props.node.isCollapsed ? 'collapsed' : 'expanded'}`);
};

// 处理嵌套 CP 按钮点击
const handleNestedCPClick = (type: NestedCPType & 'close') => {
    type === 'close' ? props.node.cp.nestedCP.close() : // 此时node.cp是NestedCP
      props.node.nestedCPManager?.get(type)?.toggle();
};

const closeNestedCPButtonConfig = {
  type: 'close',
  icon: 'mdi:close',
  tooltip: '关闭嵌套 CP',
  show: true,
}

// 定义按钮配置
const buttonConfigs = computed(() => {
  const config = [
    {
      type: NestedCPType.Action,
      icon: 'mdi:play-circle',
      tooltip: 'Action CP',
      show: props.node.nestedCPManager?.has(NestedCPType.Action),
    },
    {
      type: NestedCPType.Hook,
      icon: 'mdi:hook',
      tooltip: 'Hook',
      show: props.node.nestedCPManager?.has(NestedCPType.Hook),
    },
    {
      type: NestedCPType.SideCPLaunchPoint,
      icon: 'mdi:play-circle-outline',
      tooltip: '辅CP 执行点',
      show: props.node.nestedCPManager?.has(NestedCPType.SideCPLaunchPoint),
    },
    {
      type: NestedCPType.SideCPSyncPoint,
      icon: 'mdi:sync-circle',
      tooltip: '辅CP 同步点',
      show: props.node.nestedCPManager?.has(NestedCPType.SideCPSyncPoint),
    },
    {
      type: NestedCPType.FrameworkMountPoint,
      icon: 'mdi:framework',
      tooltip: '框架加载点',
      show: props.node.nestedCPManager?.has(NestedCPType.FrameworkMountPoint),
    },
  ]
  return props.isReplacedByNestedCP ? [closeNestedCPButtonConfig] : // 如果是嵌套CP，显示关闭按钮
    config.filter(c => c.show);
});
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

    <!-- 动态渲染各种类型的嵌套CP按钮 -->
    <EditorToolbarButton
      v-for="config in buttonConfigs"
      :key="config.type"
      :icon="config.icon"
      :tooltip="config.tooltip"
      @click.stop="handleNestedCPClick(config.type)"
      class="opacity-0 group-hover:opacity-100"
    />
  </div>
</template>

<style scoped>
.eaog-node-tailbar {
  transition: opacity 0.3s ease-in-out;
}
</style>
