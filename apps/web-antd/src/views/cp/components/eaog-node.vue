<script setup lang="ts">
/**
 * EAOG节点组件
 * 递归组件，用于渲染EAOG树形结构中的节点
 */
import { defineProps } from 'vue';
import { Badge, Tooltip } from 'ant-design-vue';
import {type EaogNode, getChildrenDirection, nodeTypeConfig} from "#/views/cp/components/eaog-node";

const props = defineProps<{
  node: EaogNode;
  level?: number;
}>();

// 默认层级为0
const nodeLevel = props.level ?? 0;

// 获取节点类型配置
const getNodeTypeConfig = (type: string) => {
  return nodeTypeConfig[type as keyof typeof nodeTypeConfig] || {
    color: 'gray',
    icon: '◆',
    description: '未知节点类型'
  };
};

// 获取子节点的布局方向
const childrenDirection = getChildrenDirection(props.node.type);


</script>

<template>
  <div class="eaog-node">
    <!-- 节点头部 -->
    <div
      class="eaog-node-header p-2 mb-2 rounded-md flex items-center relative"
      :class="{
        'cursor-pointer hover:bg-gray-50': true,
        [`border-${getNodeTypeConfig(node.type).color}-500`]: true,
        'bg-gray-50': nodeLevel === 0
      }"
    >
      <Tooltip :title="getNodeTypeConfig(node.type).description">
        <Badge
          :text="getNodeTypeConfig(node.type).icon"
          :style="{color: getNodeTypeConfig(node.type).color}"
          class="mr-2"
        />
      </Tooltip>

      <div class="flex-grow">
        <div class="font-medium">{{ node.name }}</div>
        <div v-if="node.description" class="text-xs text-gray-500">{{ node.description }}</div>
      </div>

      <div v-if="node.ref" class="ml-2 px-2 py-1 bg-gray-100 rounded-md text-xs">
        引用: {{ node.ref }}
      </div>
    </div>

    <!-- 子节点 -->
    <div
      v-if="node.children && node.children.length > 0"
      class="eaog-node-children ml-6 pl-4"
      :class="{
        'flex flex-col': childrenDirection === 'vertical',
        'flex flex-wrap gap-4': childrenDirection === 'horizontal'
      }"
    >
      <div
        v-for="(child, index) in node.children"
        :key="`${nodeLevel}-${index}`"
        :class="{
          'w-full': childrenDirection === 'vertical',
          'eaog-vertical-child': childrenDirection === 'vertical',
          'eaog-horizontal-child': childrenDirection === 'horizontal'
        }"
      >
        <EaogNode :node="child" :level="nodeLevel + 1" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* .eaog-vertical-child {
  flex: 1 1 300px;
  min-width: 200px;
  max-width: 450px;
  position: relative;
} */

/** 垂直孩子节点，非最后一个孩子 */
.eaog-vertical-child:not(:last-child) {
  @apply border-l border-gray-300
}


/** 垂直孩子节点，最后一个孩子 */
.eaog-vertical-child:last-child > .eaog-node > .eaog-node-header::before {
  content: "";
  position: absolute;
  height: 50%;
  @apply -ml-2 -mt-8 border-l border-gray-300
}


/* 确保垂直布局中的子节点也能正确定位连接线 */
.eaog-node-children {
  position: relative;
}
</style>
