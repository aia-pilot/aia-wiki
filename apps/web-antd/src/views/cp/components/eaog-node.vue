<script setup lang="ts">
/**
 * EAOG节点组件
 * 递归组件，用于渲染EAOG树形结构中的节点
 */
import { defineProps } from 'vue';
import { Badge, Tooltip } from 'ant-design-vue';
import {type EaogNode, getChildrenDirection, nodeTypeUIConfig} from "#/views/cp/components/eaog-node";
import Debug from 'debug';
const debug = Debug('aia:eaog-node');

const props = defineProps<{
  node: EaogNode;
  level?: number; // 节点层级，默认为0，便于视觉调试
}>();

// 默认层级为0
const nodeLevel = props.level ?? 0;

// 获取节点类型配置
const getNodeTypeConfig = (type: string) => {
  return nodeTypeUIConfig[type as keyof typeof nodeTypeUIConfig] || {
    color: 'gray',
    icon: '◆',
    description: '未知节点类型'
  };
};

// 获取子节点的布局方向
const childrenDirection = getChildrenDirection(props.node.type);
// debug(`Node ${props.node.name}, Type: ${props.node.type}, Children Direction: ${childrenDirection}`, props.node);


</script>

<template>
  <div class="eaog-node" :class="childrenDirection">
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

      <div class="flex-grow eaog-node-info">
        <div class="font-medium">{{ node.name }}</div>
        <div v-if="node.description" class="text-xs text-gray-500">{{ node.description }}</div>
      </div>

      <div v-if="node.ref" class="ml-2 px-2 py-1 bg-gray-100 rounded-md text-xs">
        引用: {{ node.ref }}
      </div>
    </div>

    <!-- 子节点 -->
    <div v-if="node.children && node.children.length > 0" class="eaog-node-children ml-6 pl-4">
      <div v-for="(child, index) in node.children" :key="`${node.name}-${nodeLevel}-${index}`">
        <EaogNode :node="child" :level="nodeLevel + 1" />
      </div>
    </div>
  </div>
</template>

<style scoped>

/** 节点容器 垂直布局 */
.eaog-node.vertical > .eaog-node-children {
  @apply flex flex-col;
}

/** 节点容器 垂直布局，孩子节点宽度100% */
.eaog-node.vertical > .eaog-node-children > div {
  @apply w-full;
}

/** 垂直孩子节点，非最后一个孩子。用于展示生成子节点范围的连接线。
    连接线在父节点左下，涵盖示意了子节点范围。
    最后一个孩子之前，连接线画过子节点整个高度。
    最后一个孩子，连接线只画到子节点header的中点，和其icon中点高度一致。
 */
.eaog-node.vertical > .eaog-node-children > div:not(:last-child) {
  @apply border-l border-gray-300
}

/** 垂直孩子节点，最后一个孩子。
    连接线只画到子节点header的中点，和其icon中点高度一致。
    这样可以避免最后一个孩子的连接线过长，影响视觉效果。
*/
.eaog-node.vertical > .eaog-node-children > div:last-child > .eaog-node > .eaog-node-header::before {
  content: "";
  height: 50%; /* 连接线高度为子节点header的中点 */
  @apply absolute -ml-2 -mt-8 border-l border-gray-300
}


/** 节点容器 水平布局 */
.eaog-node.horizontal > .eaog-node-children {
  @apply flex flex-wrap gap-4;
}

/** 节点容器 水平布局，heaer > eaog-node-info 展示下边线。各孩子节点将平行连接到此下边线。 TODO: media-query，布局变化，不再水平排布时，不显示下边线 */
.eaog-node.horizontal > .eaog-node-header > .eaog-node-info {
  @apply flex flex-wrap gap-4 border-b border-gray-300 pb-2;
}

/** 水平孩子节点。展示上连接线，连接到容器的下边线。TODO：media-query，布局变化，不再水平排布时，不显示上连接线 */
.eaog-node.horizontal > .eaog-node-children > div > .eaog-node::before {
  content: "";
  @apply absolute h-6 -mt-4 ml-10 border-r border-gray-300
}

/** 孩子为水平布局。展示下边线。各孩子节点将平行连接到此下边线，表示并行 */

</style>
