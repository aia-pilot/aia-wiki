<script setup lang="ts">
/**
 * EAOG节点尾部工具栏组件
 * 提供节点相关的功能按钮，如折叠/展开、同步点、钩子、子CP等
 */
import EditorToolbarButton from './editor-toolbar-button.vue';
import type {EditableEaogNodeVMType} from '../../models/editable-eaog-node-vm';
import Debug from 'debug';
import { computed } from 'vue';
import type {IntegrationType} from "#/views/cp/models/types";

const debug = Debug('aia:eaog-node-tailbar');

const props = defineProps<{
  node: EditableEaogNodeVMType;
  isReplacedByIntegratedCP?: boolean; // 是否为集成CP节点
}>();

// 处理折叠/展开按钮点击
const toggleCollapse = () => {
  props.node.toggleCollapse();
  debug(`Node ${props.node.name} ${props.node.isCollapsed ? 'collapsed' : 'expanded'}`);
};

// 处理集成CP按钮点击
const handleIntegratedCPClick = (type: IntegrationType | 'close') => {
    type === 'close' ? props.node.cp!.integratedCP.close() : // 此时node.cp是IntegratedCP
      props.node.integratedCPManager?.get(type)?.toggle();
};

const closeIntegratedCPButtonConfig = {
  type: 'close',
  icon: 'mdi:close',
  tooltip: '关闭嵌套 CP',
  show: true,
}

// 定义按钮配置
const buttonConfigs = computed(() => {
  const config = [
    {
      type: 'action',
      icon: 'mdi:play-circle',
      tooltip: 'Action CP',
      show: props.node.integratedCPManager?.has('action'),
      class: 'rotate-90',
    },
    {
      type: 'hook',
      icon: 'mdi:hook',
      tooltip: 'Hook',
      show: props.node.integratedCPManager?.has('hook'),
    },
    {
      type: 'launch',
      icon: 'mdi:play-circle-outline',
      tooltip: '辅CP 执行点',
      show: props.node.integratedCPManager?.has('launch'),
    },
    {
      type: 'sync',
      icon: 'mdi:sync-circle',
      tooltip: '辅CP 同步点',
      show: props.node.integratedCPManager?.has('sync'),
    },
    {
      type: 'mount',
      icon: 'mdi:framework',
      tooltip: '框架加载点',
      show: props.node.integratedCPManager?.has('mount'),
    },
  ]
  return props.isReplacedByIntegratedCP ? [closeIntegratedCPButtonConfig] : // 如果是集成CP，显示关闭按钮
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

    <!-- 动态渲染各种类型的集成CP按钮 -->
    <EditorToolbarButton
      v-for="config in buttonConfigs"
      :key="config.type"
      :icon="config.icon"
      :tooltip="config.tooltip"
      @click.stop="handleIntegratedCPClick(config.type as IntegrationType)"
      class="opacity-0 group-hover:opacity-100 rotate-90"
      :class="config.class || ''"
    />
  </div>
</template>

<style scoped>
.eaog-node-tailbar {
  transition: opacity 0.3s ease-in-out;
}
</style>
