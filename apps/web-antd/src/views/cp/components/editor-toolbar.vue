<script setup lang="ts">
import { VbenIconButton, VbenIcon } from '@vben-core/shadcn-ui';

defineProps<{
  // 组件的props可以根据需要添加
  isUndoAvailable: boolean;
  isRedoAvailable: boolean;
}>();

// 定义组件要触发的事件
const emit = defineEmits<{
  undo: [];
  redo: [];
  refresh: [];
  export: [];
  report: [];
  control: [];
}>();

// 事件处理函数
const handleUndo = () => {
  emit('undo');
};

const handleRedo = () => {
  emit('redo');
};

const handleRefresh = () => {
  emit('refresh');
};

const handleExport = () => {
  emit('export');
};

const handleReport = () => {
  emit('report');
};

const handleControl = () => {
  emit('control');
};
</script>

<template>
  <div class="flex items-center gap-2 p-2 border-b">
    <!-- 撤销、重做组 -->
    <VbenIconButton @click="handleUndo" :tooltip="'撤销'" :disabled="!isUndoAvailable">
      <VbenIcon icon="lucide:undo" class="size-4" />
    </VbenIconButton>
    <VbenIconButton @click="handleRedo" :tooltip="'重做'" :disabled="!isRedoAvailable">
      <VbenIcon icon="lucide:redo" class="size-4" />
    </VbenIconButton>

    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- 刷新、导出组 -->
    <VbenIconButton @click="handleRefresh" :tooltip="'刷新'">
      <VbenIcon icon="lucide:refresh-cw" class="size-4" />
    </VbenIconButton>
    <VbenIconButton @click="handleExport" :tooltip="'导出'">
      <VbenIcon icon="lucide:download" class="size-4" />
    </VbenIconButton>

    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- 报告、控制组 -->
    <VbenIconButton @click="handleReport" :tooltip="'报告'">
      <VbenIcon icon="lucide:file-text" class="size-4" />
    </VbenIconButton>
    <VbenIconButton @click="handleControl" :tooltip="'控制'">
      <VbenIcon icon="lucide:settings" class="size-4" />
    </VbenIconButton>
  </div>
</template>
