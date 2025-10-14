<template>
  <div class="w-full border-r h-full overflow-auto">
    <div class="flex items-center gap-2 p-2 border-b">
      <EditorToolbarButton icon="lucide:folder-open" tooltip="打开本地项目" @click="handleOpenFolder"/>
      <EditorToolbarButton icon="ant-design:folder-add-outlined" tooltip="新建目录" :disabled="!selected?.isDirectory"
                           @click="handleAddFolder()"/>
      <EditorToolbarButton icon="lucide:refresh-cw" tooltip="刷新" @click="handleRefreshDirectory"/>
    </div>

    <div class="p-2">
      <ul class="text-sm">
        <DirTreeItem
          v-for="item in localDirs"
          :key="item.path"
          :item="item"
          :expanded="true"
          :level="0"
          :selected="selected"
          :get-item-icon="(item) => item.isDirectory ? '📁' : '📄'"
          :get-item-class="(item) => isCpFile(item) ? 'text-green-600' : ''"
          @file-item-clicked="handleFileClick"
          @file-item-rename="handleFileRename"
          @file-item-delete="handleFileDelete"
        />
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted} from 'vue';
import DirTreeItem, {type FileNode} from './workspace-tree-item.vue';
import EditorToolbarButton from '../editor/editor-toolbar-button.vue';
// @ts-ignore
import {prompt, confirm} from '@vben/common-ui';
import {message} from "ant-design-vue";

import Debug from 'debug';

import {
  localDirs, selected, isCpFile, loadCPDirTree, openFolder, createFolder,
  renameFile, deleteFile, refreshDirectory, handleFileSelect
} from '../../viewmodels/ect/workspace';

const debug = Debug('aia-wiki-new:dir-tree-sidebar');

onMounted(async () => {
  try {
    await loadCPDirTree();
  } catch (err) {
    message.error('获取CP列表失败');
  }
});

async function handleFileClick(file: FileNode) {
  try {
    await handleFileSelect(file);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    message.warn(`加载CP模块失败: ${errorMessage}`, 10);
  }
}

async function handleOpenFolder() {
  try {
    await openFolder();
  } catch (error) {
    message.error('打开目录树对话框失败');
  }
}

async function handleAddFolder() {
  try {
    const folderName = await prompt({content: '请输入新目录名称:'}).catch(() => null);
    if (!folderName) {
      return;
    }

    await createFolder(selected.value!.path, folderName);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '新建目录失败');
  }
}

async function handleFileRename(file: FileNode) {
  try {
    const newName = await prompt({content: '请输入新名称:'});
    if (!newName) return;

    await renameFile(file, newName);
  } catch (error) {
    message.error('重命名失败');
  }
}

async function handleFileDelete(file: FileNode) {
  const confirmMessage = file.isDirectory
    ? `确定要删除目录 "${file.name}" 及其所有内容吗？`
    : `确定要删除文件 "${file.name}" 吗？`;

  try {
    const confirmed = await confirm({content: confirmMessage}).catch(() => false);
    if (!confirmed) {
      debug('用户取消了删除操作');
      return;
    }

    await deleteFile(file);
  } catch (error) {
    message.error('删除失败');
  }
}

async function handleRefreshDirectory() {
  try {
    const success = await refreshDirectory();
    if (success) {
      message.success('目录刷新成功');
    }
  } catch (error) {
    message.error('刷新目录失败');
  }
}
</script>

<style scoped>
ul {
  list-style: none;
  padding-left: 0;
}
</style>
