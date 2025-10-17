<script setup lang="ts">
/**
 * EAOG节点尾部工具栏组件
 * 提供节点相关的功能按钮，如折叠/展开、同步点、钩子、子CP等
 */
import EditorToolbarButton from './editor-toolbar-button.vue';
import type {EditableECTNode} from '../../models/ect/editable-ect';
import Debug from 'debug';
import { computed } from 'vue';
import type {IntegrationType} from "#/views/cp/models/types"; // TODO: 改为IntegrationPoint的相应类型
import type {IntegrationPoint} from "aia-cpm/cpi";
import {parallelCPs} from "#/views/cp/viewmodels/cp-editor-state";

const debug = Debug('aia:eaog-node-tailbar');

const props = defineProps<{
  node: EditableECTNode;
}>();

const showNode = props.node.ui.showNode;

// 处理显示/隐藏并行辅CP按钮点击
const showParallelCP = (ect: EditableECTNode) => {
  if (parallelCPs.value[0] === ect.cp) {
    parallelCPs.value = []; // 关闭显示
  } else {
    parallelCPs.value = [ect.cp]; // 显示该辅CP
  }
};


const closeIntegratedCPButtonConfig = {
  type: 'close',
  icon: 'mdi:close',
  tooltip: '关闭嵌套 CP',
  count: 1,
}

const countIntegratedCPs = (type: IntegrationType) => {
  // return props.node.root.integrationManager!.get(props.node, type, (i) => i.isCPIntegration).length;
  return (props.node.$.launchIPs || []).filter((ip: IntegrationPoint) => ip.kind === type).length;
};
// 定义按钮配置
const buttonConfigs = computed(() => {
  const config = [
    {
      type: 'action',
      icon: 'mdi:play-circle',
      tooltip: 'Action CP',
      count: countIntegratedCPs('action'),
      class: 'rotate-90',
    },
    {
      type: 'hook',
      icon: 'mdi:hook',
      tooltip: 'Hook',
      count: countIntegratedCPs('hook'),
    },
    {
      type: 'launch',
      icon: 'mdi:play-circle-outline',
      tooltip: '辅CP 执行点',
      count: countIntegratedCPs('launch'),
    },
    {
      type: 'sync',
      icon: 'mdi:sync-circle',
      tooltip: '辅CP 同步点',
      count: countIntegratedCPs('sync'),
    },
    {
      type: 'mount',
      icon: 'mdi:framework',
      tooltip: '框架加载点',
      count: countIntegratedCPs('mount'),
    },
  ]
  return props.node.hasIntegration ? [closeIntegratedCPButtonConfig] : // 如果是被集成CP，显示关闭按钮
    config.filter(c => c.count > 0); // 是顶层CP，显示有集成CP对应类型的按钮
});
</script>

<template>
  <div class="eaog-node-tailbar flex items-center">

    <!-- 开关嵌套（阻塞）集成CPs -->
    <EditorToolbarButton
      v-if="node.blockECTs.length > 0"
      icon="mdi:folder-lock-open"
      :tooltip="node.isShowIntegratedCPs ? '隐藏嵌套 CP' : '显示嵌套 CP'"
      @click.stop="node.ui.toggleBlockECTs();"
      class="text-green-500 opacity-100"
      :class="{ 'opacity-30 group-hover:opacity-100': !node.isShowIntegratedCPs }"
    />

    <!-- 开关并行集成CPs -->
    <EditorToolbarButton
      v-for="ip in showNode.parallelIntegrationPoints"
      :key="ip.integratedECT.id"
      :icon="ip.kind === 'hook' ? 'mdi:hook' : 'mdi:play-circle-outline'"
      :tooltip="`显示/隐藏 并行辅程: ${ip.integratedECT.name}`"
      @click.stop="showParallelCP(ip.integratedECT)"
      class="text-purple-500 opacity-100"
      :class="{ 'opacity-30 group-hover:opacity-100': !(parallelCPs[0] === ip.integratedECT.cp) }"
    />

    <!-- 折叠/展开按钮 -->
    <EditorToolbarButton
      v-if="showNode.isContainer"
      :icon="showNode.isFramework && showNode.meta?.icon ? showNode.meta.icon : (showNode.ui.isCollapsed ? 'ant-design:down-outlined' : 'ant-design:up-outlined')"
      :tooltip="showNode.ui.isCollapsed ? '展开子节点' : '折叠子节点'"
      @click.stop="showNode.ui.toggleCollapse()"
      class="text-blue-500 opacity-100"
      :class="{ 'opacity-0 group-hover:opacity-100': !showNode.ui.isCollapsed }"
    />

  </div>
</template>

<style scoped>
.eaog-node-tailbar {
  transition: opacity 0.3s ease-in-out;
}
</style>
