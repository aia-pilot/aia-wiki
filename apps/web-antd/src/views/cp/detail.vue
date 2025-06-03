<script setup lang="ts">
/**
 * ## CP(eaog) Detail Page
 * Cognitive Program 是一种可执行的树结构(Executable And Or Graph），其叶子节点是 Action。非叶节点是结构，说明孩子节点的执行顺序（顺序、并行）与关系（条件）。
 * 本页面是CP（Eaog）的可视化展示，用树形图来展示CP的结构。
 *
 * ### 可视化策略
 * **时间隐喻**：垂直方向，由上到下，隐喻了时间的先后顺序。因此，顺序节点的孩子垂直排列，并行、条件节点的孩子水平排列。
 * **空间隐喻**：用空间布局上的嵌套关系表达父子关系。父节点的空间包含子节点的空间。子节较父节点水平缩进，表示子节点在父节点的空间内。
 * **空间隐喻**：用空间布局上的嵌套关系表达父子关系。父节点的空间包含子节点的空间。子节较父节点水平缩进，表示子节点在父节点的空间内。
 * **浏览器布局**：使用浏览器的布局引擎来实现树形图的布局。充分利用CSS的flexbox和grid布局来实现节点的排列。
 */

import {ref} from 'vue';
import {advancedFlow, complexFlow, simpleSequentialFlow} from './eaog-samples';
import {Badge, Card, Select, Tooltip} from 'ant-design-vue';
import EaogNodeComponent from './components/eaog-node.vue';
import {type EaogNode, nodeTypeConfig} from "#/views/cp/components/eaog-node";

// 当前选中的流程
const selectedFlow = ref<EaogNode>(complexFlow);
const availableFlows = [
  { label: '简单顺序流程', value: 'simpleSequentialFlow' },
  { label: '复杂流程', value: 'complexFlow' },
  { label: '高级流程', value: 'advancedFlow' }
];

// 选择要展示的流程
const handleFlowChange = (value: string) => {
  switch (value) {
    case 'simpleSequentialFlow':
      selectedFlow.value = simpleSequentialFlow;
      break;
    case 'complexFlow':
      selectedFlow.value = complexFlow;
      break;
    case 'advancedFlow':
      selectedFlow.value = advancedFlow;
      break;
  }
};

 </script>

<template>
  <div class="p-4">
    <div class="mb-6">
      <Card title="CP(eaog) 可视化展示" class="shadow-md">
        <div class="mb-4 flex items-center">
          <span class="mr-2 font-medium">选择示例流程:</span>
          <Select
            v-model:value="availableFlows[1].value"
            style="width: 200px"
            @change="handleFlowChange"
          >
            <Select.Option
              v-for="flow in availableFlows"
              :key="flow.value"
              :value="flow.value"
            >
              {{ flow.label }}
            </Select.Option>
          </Select>
        </div>

        <!-- 图例说明 -->
        <div class="mb-4 p-3 bg-gray-50 rounded-md">
          <div class="text-lg font-medium mb-2">图例说明:</div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div
              v-for="(config, type) in nodeTypeConfig"
              :key="type"
              class="flex items-center"
            >
              <Badge :color="config.color" />
              <span class="mx-1 font-mono">{{ config.icon }}</span>
              <Tooltip :title="config.description">
                <span class="text-sm cursor-help">{{ type }}</span>
              </Tooltip>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <!-- CP可视化树 -->
    <div class="eaog-tree-container p-4 bg-white rounded-lg shadow-md">
      <EaogNodeComponent :node="selectedFlow" />
    </div>
  </div>
</template>

<style scoped>
.eaog-tree-container {
  max-width: 100%;
  overflow-x: auto;
}
</style>
