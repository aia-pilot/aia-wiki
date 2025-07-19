<script setup lang="ts">
/**
 * CP面板
 * 显示当前CP的hooks和sideCPs数据
 */
import {JsonViewer} from '@vben/common-ui';
import {loadCpModuleFromCpStr} from '#/views/cp/models/cp-loader';
import {currentEaog} from '#/views/cp/models/cp-editor-state';
import {computed} from 'vue';

// 计算hooks和sideCPs数据
const hooksData = computed(() => {
  return currentEaog.value?.cp?.hooks || [];
});

const sideCPsData = computed(() => {
  return currentEaog.value?.cp?.sideCPs || [];
});

// 判断是否有CP数据 TODO: 移除
const hasCP = computed(() => {
  return currentEaog.value.cp !== null;
});
</script>

<template>
  <div class="cp-panel">
    <div v-if="!hasCP" class="text-gray-500 text-center py-8">
      暂无CP数据
    </div>

    <div v-else class="space-y-6">
      <!-- Hooks数据展示 -->
      <div>
        <div class="font-medium mb-3 text-lg">Hooks 数据</div>
        <div v-if="hooksData.length === 0" class="text-gray-500 text-sm">
          暂无hooks数据
        </div>
        <JsonViewer
          v-else
          :value="hooksData"
          :expand-depth="2"
          copyable
          boxed
        />
      </div>

      <!-- SideCPs数据展示 -->
      <div>
        <div class="font-medium mb-3 text-lg">SideCPs 数据</div>
        <div v-if="sideCPsData.length === 0" class="text-gray-500 text-sm">
          暂无sideCPs数据
        </div>
        <!--  对应的sideCP的列表      -->
        <div v-else>
          <ul v-if="sideCPsData.length > 0" class="text-gray-500 text-sm mb-2">
            <li v-for="(sideCP, index) in sideCPsData" :key="index">
              <a href="#" class="text-blue-500 hover:underline" @click.prevent="loadCpModuleFromCpStr(sideCP.cp)">
                {{ sideCP.cp }}
              </a>
            </li>
          </ul>

          <JsonViewer
            :value="sideCPsData"
            :expand-depth="2"
            copyable
            boxed
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cp-panel {
  height: 100%;
  overflow-y: auto;
}
</style>
