<template>
  <div class="w-full border-r h-full overflow-auto">
    <div class="flex items-center gap-2 p-2 border-b">
      <EditorToolbarButton icon="lucide:folder-open" tooltip="打开本地项目" @click="openFolder"/>
      <EditorToolbarButton icon="ant-design:folder-add-outlined" tooltip="新建目录" :disabled="!selected?.isDirectory"
                           @click="addFolder()"/>
      <EditorToolbarButton icon="lucide:refresh-cw" tooltip="刷新" @click="handleRefresh"/>
    </div>

    <div class="p-2">
      <ul class="text-sm">
        <DirTreeItem
          v-for="item in fileTree"
          :key="item.path"
          :item="item"
          :expanded="true"
          :level="0"
          :selected="selected"
          :get-item-icon="(item) => item.isDirectory ? '📁' : '📄'"
          :get-item-class="(item) => item.path.endsWith('.eaog.js') ? 'text-green-600' : ''"
          @file-item-clicked="handleFileClick"
          @file-item-rename="handleFileRename"
          @file-item-delete="handleFileDelete"
        />
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted} from 'vue';
import DirTreeItem from './local-dir-tree-item.vue';
import type {FileNode} from './local-dir-tree-item.vue';
import {message} from "ant-design-vue";
import EditorToolbarButton from "#/views/cp/components/editor/editor-toolbar-button.vue";
import {prompt, confirm} from '@vben/common-ui';

import Debug from 'debug';
import {loadCurrentEaog} from "#/views/cp/models/editable-eaog-node";
import {loadEaogModule} from "#/views/cp/models/eaog-loader";
const debug = Debug('aia-wiki-new:dir-tree-sidebar');

const fileTree = ref<FileNode[]>([]);
const selected = ref<FileNode | undefined>(undefined);

onMounted(async () => {
  // 尝试从localStorage恢复上次打开的目录
  const lastSelectedDir = localStorage.getItem('aia-cp-editor-last-selected-dir');
  if (lastSelectedDir) {
    // @ts-ignore
    const fileTrees = await window.electronAPI.invokeMain('use-sys-get-dir-tree', { path: lastSelectedDir });
    addFileTrees(fileTrees);
  }
});

function addFileTrees(fileTrees: any) {
  // 遍历fileTrees，给每个节点加上expanded = false
  fileTrees.forEach(normalizeFileTree);
  fileTree.value = fileTrees || [];
  selected.value = fileTree.value[0];
  selected.value!.expanded = true; // 默认选中第一个目录并展开
}

async function openFolder() {
  try {
    // @ts-ignore
    const fileTrees = await window.electronAPI.invokeMain('use-sys-open-dir-tree-dialog', {
      title: '选择文件夹',
    });
    addFileTrees(fileTrees);
    localStorage.setItem('aia-cp-editor-last-selected-dir', selected.value.path); // 保存最后打开的目录，下次浏览器打开时可以恢复
  } catch (error) {
    console.error('打开目录树对话框失败:', error);
    message.error('打开目录树对话框失败');
  }
}

async function addFolder() {
  const folderName = await prompt({content: '请输入新目录名称:'}).catch(() => null)
  if (!folderName || !selected.value || !selected.value.isDirectory) {
    message.error('请选择一个目录并输入有效的目录名称');
    return;
  }
  try {
    // @ts-ignore
    const newFolderPath = await window.electronAPI.invokeMain('use-sys-create-folder', {
      parent: selected.value.path,
      name: folderName,
    });
    if (newFolderPath) {
      // 更新文件树
      const newFolder: FileNode = {
        name: folderName,
        path: newFolderPath,
        isDirectory: true,
        size: 0,
        lastModified: new Date(),
        expanded: true,
        children: []
      };
      selected.value.children!.unshift(newFolder);
      selected.value = newFolder; // 选中新建的目录
    }
  } catch (error) {
    console.error('新建目录失败:', error);
    message.error('新建目录失败');
  }
}

function normalizeFileTree(node: FileNode) {
  node.expanded = false; // 默认不展开
  node.lastModified = new Date(node.lastModified); // 确保lastModified是Date对象
  if (node.children) {
    node.children.forEach(normalizeFileTree);
  }
}

async function handleFileClick(file: FileNode) {
  selected.value = file;
  debug('Selected file:', file);
  if (file.path.endsWith('.eaog.js')) {
    const { eaog } = await loadEaogModule(file.path);
    await loadCurrentEaog(eaog)
  }
}

async function handleFileRename(file: FileNode) {
  const newName = await prompt({content: '请输入新名称:'});
  if (newName && newName !== file.name) {
    try {
      // @ts-ignore
      await window.electronAPI.invokeMain('use-sys-rename-file-dir', {
        oldPath: file.path,
        newPath: file.path.replace(file.name, newName)
      });
      file.name = newName; // 更新文件名
      debug('File renamed to:', newName);
    } catch (error) {
      console.error('重命名失败:', error);
      message.error('重命名失败');
    }
  }
}

async function handleFileDelete(file: FileNode) {
  const [confirmMessage, channel] = file.isDirectory
    ? [`确定要删除目录 "${file.name}" 及其所有内容吗？`, 'use-sys-delete-dir']
    : [`确定要删除文件 "${file.name}" 吗？`, 'use-sys-delete-file'];


  await confirm({content: confirmMessage}) // 注意：Vben的confirm没有返回值，而是用then、catch来对应confirm和cancel
    .then(async () => {
      try {
        // @ts-ignore
        await window.electronAPI.invokeMain(channel, {path: file.path});
        const index = selected.value?.children?.indexOf(file);
        if (index !== undefined && index > -1) {
          selected.value!.children!.splice(index, 1); // 从当前目录中删除
        }
        debug('File deleted:', file.name);
      } catch (error) {
        console.error('删除失败:', error);
        message.error('删除失败');
      }
    })
    .catch(() => {
      console.warn('用户取消了删除操作');
    });
}

async function handleRefresh() {
  try {
    // @ts-ignore
    const refreshedTree = await window.electronAPI.invokeMain('use-sys-get-dir-tree', {path: fileTree.value[0].path});
    addFileTrees(refreshedTree);
    message.success('目录刷新成功');
  } catch (error) {
    console.error('刷新目录失败:', error);
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
