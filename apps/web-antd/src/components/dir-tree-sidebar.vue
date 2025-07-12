<template>
  <div class="w-64 bg-white dark:bg-neutral-900 border-r h-full overflow-auto">
    <div class="p-2 border-b">
      <button
        class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        @click="openFolder"
      >
        打开文件夹
      </button>
    </div>

    <div class="p-2">
      <ul class="text-sm">
        <DirTreeItem
          v-for="item in fileTree"
          :key="item.path"
          :item="item"
          :level="0"
          :selected-path="selectedPath"
          @file-clicked="handleFileClick"
        />
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DirTreeItem from './dir-tree-item.vue';
import {IS_STANDALONE_APP} from "#/utils/aia-constants";
import {message} from "ant-design-vue";

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

const fileTree = ref<FileNode[]>([]);
const selectedPath = ref<string>('');

async function openFolder() {
  try {
    if (IS_STANDALONE_APP) {
      // @ts-ignore
      const tree = await window.electronAPI.invokeMain('use-sys-open-dir-tree-dialog', {
        title: '选择文件夹',
      });
      fileTree.value = tree || [];
      selectedPath.value = '';
    } else {
      message.warning('在浏览器环境中无法使用系统目录树对话框');
    }
  } catch (error) {
    console.error('打开目录树对话框失败:', error);
    message.error('打开目录树对话框失败');
  }
}

function handleFileClick(file: FileNode) {
  selectedPath.value = file.path;
  console.log('Selected file:', file);
}
</script>

<style scoped>˚
ul {
  list-style: none;
  padding-left: 0;
}
</style>
