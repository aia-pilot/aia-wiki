<script setup lang="ts">
/**
 * CP（EAOG）节点组件
 * 递归组件，用于渲染EAOG树形结构中的节点
 *
 * ## CP(eaog)
 * Cognitive Program 是一种可执行的树结构(Executable And Or Graph），其叶子节点是 Action。非叶节点是结构，说明孩子节点的执行顺序（顺序、并行）与关系（条件）。
 * 本页面是CP（Eaog）的可视化展示，用树形图来展示CP的结构。
 *
 * ### 可视化策略
 * **时间隐喻**：垂直方向，由上到下，隐喻了时间的先后顺序。因此，顺序节点的孩子垂直排列，并行、条件节点的孩子水平排列。
 * **空间隐喻**：用空间布局上的嵌套关系表达父子关系。父节点的空间包含子节点的空间。子节较父节点水平缩进，表示子节点在父节点的空间内。
 * **空间隐喻**：用空间布局上的嵌套关系表达父子关系。父节点的空间包含子节点的空间。子节较父节点水平缩进，表示子节点在父节点的空间内。
 * **浏览器布局**：使用浏览器的布局引擎来实现树形图的布局。充分利用CSS的flexbox和grid布局来实现节点的排列。
 */

import { defineProps, defineEmits, ref } from 'vue';
import { Badge, Tooltip } from 'ant-design-vue';
import {type EaogNode, getChildrenDirection, nodeTypeUIConfig} from "#/views/cp/components/eaog-node";
import Debug from 'debug';
const debug = Debug('aia:eaog-node');

const isSelected = ref(false); // 选中状态，默认为false

const props = defineProps<{
  node: EaogNode;
  level?: number; // 节点层级，默认为0，便于视觉调试
}>();

const emit = defineEmits<{
  'node-click': [ node: EaogNode, event: Event, isSelected: Ref<boolean> ];
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

// 处理节点点击
const handleNodeClick = (event: Event) => {
  debug(`Node clicked: ${props.node.name}`);
  // isSelected.value = !isSelected.value; // 让editor组件控制是否选中
  emit('node-click', props.node, event, isSelected);
};

// 处理系统右键菜单事件，附加当前node
const handleContextMenu = (event: MouseEvent) => {
  debug(`Context menu for node: ${props.node.name}`);
  event.eaogNode = props.node; // 将当前节点附加到事件对象上，以便在右键菜单中使用
};

</script>

<template>
  <div class="eaog-node" :class="childrenDirection">
    <!-- 节点头部 -->
    <div
      class="eaog-node-header p-2 mb-2 rounded-md flex items-center relative"
      :class="{
        'cursor-pointer hover:bg-gray-50': true,
        [`border-${getNodeTypeConfig(node.type).color}-500`]: true,
        'bg-gray-50': nodeLevel === 0,
        'bg-blue-100 border-2': isSelected // 选中状态高亮
      }"
      @click.prevent="handleNodeClick"
      @contextmenu="handleContextMenu"
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
        <eaog-node
          :node="child"
          :level="nodeLevel + 1"
          @node-click="(node, event, isSelectedRef) => emit('node-click', node, event, isSelectedRef)"
        />
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
