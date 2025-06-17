<script setup lang="ts">
/**
 * CP（EAOG）节点组件
 * 递归组件，用于渲染EAOG树形结构中的节点
 *
 * ## CP(eaog)
 * Cognitive Program 是一种可执行的树结构(Executable And Or Graph），其叶子节点是 Action。非叶节点是结构��点说明孩子节点的执行顺序（顺序、并行）与关系（条件）。
 * 本页面是CP（Eaog）的可视化展示，用树形图来展示CP的结构。
 *
 * ### 可视化策略
 * **时间隐喻**：垂直方向，由上到下，隐喻了时间的先后顺序。因此，顺序节点的孩子垂直排列，并行、条件节点的孩子水平排列。
 * **空间隐喻**：用空间布局上的嵌套关系表达父子关系。父节点的空间包含子节点的空间。子节较父节点水平缩进，表示子节点在父节点的空间内。
 * **空间隐喻**：用空间布局上的嵌套关系表达父子关系。父节点的空间包含子节点的空间。子节较父节点水平缩进，表示子节点在父节点的空间内。
 * **浏览器布局**：使用浏览器的布局引擎来实现树形图的布局。充分利用CSS的flexbox和grid布局来实现节点的排列。
 */

import {defineProps} from 'vue';
import {Badge, Tooltip} from 'ant-design-vue';
import {
  type EditableEaogNode,
  nodeTypeUIConfig
} from "#/views/cp/models/editable-eaog-node";
import Debug from 'debug';
import {VbenIcon} from "@vben-core/shadcn-ui";
import EaogNodeForm from "#/views/cp/components/eaog-node-form.vue";

const debug = Debug('aia:eaog-node');

const props = defineProps<{
  node: EditableEaogNode;
  eaogNodeForm: InstanceType<typeof EaogNodeForm> | undefined; // EaogNodeForm实例，用于编辑节点
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

// 处理节点点击
const handleNodeClick = (event: MouseEvent) => {
  debug(`Node clicked: ${props.node.name}`);
  // 使用EditableEaogNode的click方法，直接更新节点状态
  props.node.click(true, event.shiftKey);
};

// 处理折叠/展开按钮点击
const toggleCollapse = (event: Event) => {
  event.stopPropagation(); // 阻止事件冒泡，避免触发节点的点击事件
  props.node.toggleCollapse(); // 使用EditableEaogNode的toggleCollapse方法
  debug(`Node ${props.node.name} ${props.node.isCollapsed ? 'collapsed' : 'expanded'}`);
};

// 处理系统右键菜单事件，附加当前node
const handleContextMenu = (event: MouseEvent) => {
  debug(`Context menu for node: ${props.node.name}`);
  // 设置node为当前点击的节点
  props.node.click(false); // 只设置为点击状态，不改变选中状态
  // @ts-ignore 将当前节点附加到事件对象上，以便在右键菜单中使用
  event.eaogNode = props.node;
};
</script>

<template>
  <!-- 使用 node.childrenDirection 来动态设置 class -->
  <div class="eaog-node" :class="[node.childrenDirection, { 'newly-added': node.isNewlyModified, 'framework': node.isFramework }]">
    <!-- 节点头部 -->
    <div class="eaog-node-header p-2 mb-2 rounded-md flex items-center relative select-none cursor-pointer group"
         :class="{
          [`border-${getNodeTypeConfig(node.type).color}-500`]: true,
          'bg-gray-50': nodeLevel === 0,
          'bg-blue-100 border-2': node.isSelected,
          'border border-blue-200': node.isFramework && node.isCollapsed, // 框架节点折叠时显示双线边框
          'hover:bg-gray-50': !node.isSelected // 非选中状态时，hover效果
        }"
         @click.prevent="handleNodeClick"
         @dblclick.stop="eaogNodeForm?.editNode()"
         @contextmenu="handleContextMenu"
    >

      <!-- 条件分支 -->
      <div v-if="node.parent?.type === 'cor'" class="cor-children-chioce absolute left-11 -top-3 transform text-xs text-gray-400">
        {{ node.choice }}
      </div>

      <Tooltip :title="getNodeTypeConfig(node.type).description">
        <Badge
          :text="getNodeTypeConfig(node.type).icon"
          :style="{color: getNodeTypeConfig(node.type).color}"
          class="mr-2"
        />
      </Tooltip>

      <div class="flex-grow eaog-node-info">
        <!--   框架节点，折叠时，显示其挂载的节点名称与描述，更容易为用户理解。    -->
        <div class="font-medium">{{ node.isFramework && node.isCollapsed ? `框架：<${ node.mountedNode.name }>` : node.name }}</div>
        <div v-if="node.description" class="text-xs text-gray-500">{{ node.isFramework ? node.mountedNode.description : node.description }}</div>
      </div>

      <div v-if="node.ref" class="ml-2 px-2 py-1 text-xs text-gray-400">
        引用: {{ node.ref }}
      </div>

      <!-- 折叠/展开 子节点（子树） -->
      <VbenIcon
        v-if="node.children && node.children.length > 0"
        :icon="node.isFramework ? node.meta.icon : 'ant-design:down-outlined'"
        class="size-4 shrink-0 transition-all duration-300 ease-in-out ml-2 text-gray-800"
        :class="{
          'text-blue-500': node.isFramework,
          'opacity-100': node.isCollapsed,
          'transform rotate-180 opacity-0 group-hover:opacity-100': !node.isCollapsed
        }"
        @click.stop="toggleCollapse"
      />
    </div>

    <!-- 子节点（子树）-->
    <div v-if="node.children && node.children.length > 0 && !node.isCollapsed" class="eaog-node-children ml-6 pl-4">
      <div v-for="child in node.children" :key="child.name">
        <eaog-node :node="child" :eaogNodeForm="eaogNodeForm" :level="nodeLevel + 1"/>
      </div>
    </div>
  </div>
</template>

<style scoped>

/* stylelint-disable */
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
    这样可以避免最后一个孩子的连接线过长，影响��觉效果。
*/
.eaog-node.vertical > .eaog-node-children > div:last-child > .eaog-node > .eaog-node-header::before {
  content: "";
  height: 50%; /* 连接���高度为子节点header的中点 */
  @apply absolute -ml-2 -mt-8 border-l border-gray-300
}


/** 节点容器 水平布局 */
.eaog-node.horizontal > .eaog-node-children {
  @apply flex flex-wrap gap-4;
}

/** 节点容器 水平布局，header > eaog-node-info 展示下边线。各孩子节点将平行连接到此下边线。 TODO: media-query，布局变化，不再水平排布时，header显示下边线 */
.eaog-node.horizontal > div.eaog-node-header > div.eaog-node-info {
  @apply flex flex-wrap gap-4 border-b border-gray-300 pb-2;
}

/** 水平孩���节点。展示上连接线，连接到容器的下边线。TODO：media-query，布局变化，不再水平排布时，不显示上连接线 */
.eaog-node.horizontal > .eaog-node-children > div > .eaog-node::before {
  content: "";
  @apply absolute h-6 -mt-4 ml-10 border-r border-gray-300
}

/** 孩子为水平布局。展示下边线。各孩子节点将平行连接到此下边线，表示并行 */

/** 新添加节点的动画效果 */
.newly-added {
  animation: highlight-effect 2s ease-in-out;
}


/** 节点为framework（根）时，且折叠式，和节点容器水平布局一样，展示下边线。 TODO: media-query，布局变化，不再水平排布时，header显示下边线 */
/**
.eaog-node.framework > div.eaog-node-header > div.eaog-node-info {
  @apply border-b border-gray-300 pb-2;
}
*/

@keyframes highlight-effect {
  0% {
    opacity: 0;
    transform: scale(0.95);
    box-shadow: 0 0 0 rgba(59, 130, 246, 0);
  }
  30% {
    opacity: 1;
    transform: scale(1.01);
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
  }
  100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 0 rgba(59, 130, 246, 0);
  }
}

.newly-added > .eaog-node-header {
  animation: glow-effect 2s ease-in-out;
}

@keyframes glow-effect {
  0% {
    background-color: rgba(219, 234, 254, 0.1);
  }
  30% {
    background-color: rgba(219, 234, 254, 0.9);
  }
  100% {
    background-color: inherit;
  }
}

</style>
