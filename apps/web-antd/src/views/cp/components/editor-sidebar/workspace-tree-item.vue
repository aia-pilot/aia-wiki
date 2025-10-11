<template>
  <li>
    <ContextMenuRoot>
      <ContextMenuTrigger as-child>
        <div
          class="flex items-center cursor-pointer px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-neutral-800"
          :class="{
            'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300': isSelected,
            [getItemClass?.(item) || '']: true
          }"
          @click="onItemClick"
        >
          <!-- 展开图标 -->
          <span
            v-if="item.isDirectory"
            class="mr-1 w-4 text-center select-none"
            @click.stop="toggle"
          >
            {{ item.expanded ? '▾' : '▸' }}
          </span>
          <span v-else class="mr-1 w-4"/>

          <!-- 类型图标 -->
          <span class="mr-2 w-4 text-center select-none">
            {{ getItemIcon(item) }}
          </span>

          <!-- 文件名 -->
          <span :style="{ paddingLeft: `${level * 12}px` }">
            {{ item.name }}
          </span>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent class="bg-white dark:bg-neutral-800 shadow-md rounded p-1 text-sm z-50">
        <ContextMenuItem @click="emit('file-item-rename', item)" class="context-menu-item">
          ✏️  重命名
        </ContextMenuItem>
        <ContextMenuItem @click="emit('file-item-delete', item)" class="context-menu-item text-red-600">
          🗑  删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuRoot>

    <!-- 子项递归 -->
    <ul v-if="item.isDirectory && item.expanded" class="pl-2">
      <template v-if="item.children && item.children.length">
        <workspace-tree-item
          v-for="child in item.children.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()) /* 按最后修改时间降序 */"
          :key="child.path"
          :item="child"
          :level="level + 1"
          :selected="selected"
          :get-item-icon="getItemIcon"
          :get-item-class="getItemClass"
          @file-item-clicked="$emit('file-item-clicked', $event)"
          @file-item-rename="$emit('file-item-rename', $event)"
          @file-item-delete="$emit('file-item-delete', $event)"
        />
      </template>
      <li v-else class="text-gray-400 text-xs italic px-4 py-1">
        （空）
      </li>
    </ul>
  </li>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import {ContextMenuRoot, ContextMenuTrigger, ContextMenuContent, ContextMenuItem} from 'radix-vue';
import { expandDirectory } from '../../viewmodels/ect/workspace';

export interface FileNode {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
  expanded: boolean;
  children?: FileNode[];
}

const props = defineProps<{
  item: FileNode;
  level: number;
  selected: FileNode | undefined;
  getItemIcon: (item: FileNode) => string;
  getItemClass?: (item: FileNode) => string;
}>();

const emit = defineEmits<{
  'file-item-clicked': [file: FileNode];
  'file-item-rename': [file: FileNode];
  'file-item-delete': [file: FileNode];
}>();

const isSelected = computed(() => props.selected === props.item);

async function toggle() {
  if (props.item.isDirectory) {
    // 如果要展开目录，并且还没有加载过子项或子项为空，则懒加载子目录
    if (!props.item.expanded && (!props.item.children || props.item.children.length === 0)) {
      try {
        await expandDirectory(props.item);
      } catch (error) {
        console.error('无法加载目录内容:', error);
      }
    } else {
      // 已经加载过的目录，直接切换展开状态
      props.item.expanded = !props.item.expanded;
    }
  }
}

function onItemClick() {
  if (props.item.isDirectory) toggle();
  emit('file-item-clicked', props.item);
}
</script>

<style scoped>
.context-menu-item {
  @apply flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:cursor-pointer;
}
</style>
