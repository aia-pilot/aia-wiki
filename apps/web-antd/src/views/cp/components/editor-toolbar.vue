<script setup lang="ts">
import EditorToolbarButton from './editor-toolbar-button.vue';

defineProps<{
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
  open: [];
  import: [];
  save: [];
}>();

</script>

<template>
  <div class="flex items-center gap-2 p-2 border-b">
    <!-- 打开、导入组 -->
    <EditorToolbarButton icon="lucide:folder-open" tooltip="打开" @click="emit('open')" />
    <EditorToolbarButton icon="lucide:upload" tooltip="导入" @click="emit('import')" />

    <!-- 分组间隔竖线  -->
    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- 刷新、导出、保存组 -->
    <EditorToolbarButton icon="lucide:refresh-cw" tooltip="刷新" @click="emit('refresh')" />
    <EditorToolbarButton icon="lucide:save" tooltip="保存" @click="emit('save')" />
    <EditorToolbarButton icon="lucide:download" tooltip="导出" @click="emit('export')" />

    <!-- 分组间隔竖线  -->
    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- 报告、控制组 -->
    <EditorToolbarButton icon="lucide:file-text" tooltip="报告" @click="emit('report')" />
    <EditorToolbarButton icon="lucide:settings" tooltip="控制" @click="emit('control')" />

    <!-- 分组间隔竖线  -->
    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- 撤销、重做组 -->
    <EditorToolbarButton icon="lucide:undo" tooltip="撤销" :disabled="!isUndoAvailable" @click="emit('undo')" />
    <EditorToolbarButton icon="lucide:redo" tooltip="重做" :disabled="!isRedoAvailable" @click="emit('redo')" />
  </div>
</template>
