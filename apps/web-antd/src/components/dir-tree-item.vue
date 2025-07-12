<template>
  <li>
    <div
      class="flex items-center cursor-pointer px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
      :class="{
        'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300': isSelected,
      }"
      @click="onItemClick"
    >
      <!-- 展开图标 -->
      <span
        v-if="item.isDirectory"
        class="mr-1 w-4 text-center select-none"
        @click.stop="toggle"
      >
        {{ expanded ? '▾' : '▸' }}
      </span>
      <span v-else class="mr-1 w-4" />

      <!-- 类型图标 -->
      <span class="mr-2 w-4 text-center select-none">
        {{ item.isDirectory ? '📁' : '📄' }}
      </span>

      <!-- 文件名 -->
      <span :style="{ paddingLeft: `${level * 12}px` }">
        {{ item.name }}
      </span>
    </div>

    <!-- 子项递归 -->
    <ul v-if="item.isDirectory && expanded" class="pl-2">
      <template v-if="item.children && item.children.length">
        <dir-tree-item
          v-for="child in item.children"
          :key="child.path"
          :item="child"
          :level="level + 1"
          :selected-path="selectedPath"
          @file-clicked="$emit('file-clicked', $event)"
        />
      </template>
      <li v-else class="text-gray-400 text-xs italic px-4 py-1">
        （空）
      </li>
    </ul>
  </li>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

const props = defineProps<{
  item: FileNode;
  level: number;
  selectedPath: string;
}>();

const expanded = ref(false);

const isSelected = computed(() => props.selectedPath === props.item.path);

function toggle() {
  expanded.value = !expanded.value;
}

function onItemClick() {
  if (!props.item.isDirectory) {
    emit('file-clicked', props.item);
  } else {
    toggle();
  }
}

const emit = defineEmits<{
  (e: 'file-clicked', file: FileNode): void;
}>();
</script>
