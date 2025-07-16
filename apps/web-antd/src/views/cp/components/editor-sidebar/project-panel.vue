<script setup lang="ts">
/**
 * 项目面板
 * 显示项目文件结构，支持文件���文件夹的创建、重命名和删除
 */
import {computed, inject, type Ref, onMounted} from 'vue';
import {prompt, confirm} from '@vben/common-ui';
import {message} from 'ant-design-vue';
import {VbenTree} from '@vben-core/shadcn-ui';
import {IconifyIcon} from '@vben/icons';
import type {FlattenedItem} from 'radix-vue';
import type {Recordable} from '@vben/types';

import EaogNodeForm from '../editor/eaog-node-form.vue';
import {projectManager, currentFolder, currentFile} from './project';

import Debug from 'debug';
import {clipboardNode, loadCurrentEaog} from "#/views/cp/models/editable-eaog-node";

const debug = Debug('aia:cp:project-panel');

// 项目文件树数据
const projectTree = computed(() => projectManager.getTreeData());

const eaogNodeForm = inject<Ref<InstanceType<typeof EaogNodeForm> | undefined>>('eaogNodeForm');

const setCurrentFolderAndLoadFile = (item: FlattenedItem<Recordable<any>>) => {
  if (item) {
    const selectedFile = item.value;
    debug('选择文件:', selectedFile);
    projectManager.setCurrentFolder(selectedFile.id);

    if (selectedFile.type === 'file') {
      // 如果是EAOG文件且有内容，加载到编辑器
      projectManager.setCurrentFile(selectedFile.id);
    }
  }
};

// 创建新文件
const createFile = async () => {
  if (clipboardNode.value) {
    await loadCurrentEaog(clipboardNode.value, true);
  } else {
    eaogNodeForm!.value!.createEaog()
  }
}

// 重命名文件或文件夹
const renameFile = async (event: any) => {
  const fileToRename = event.__item__.value; // @参考：shadcn-ui/src/ui/tree/tree.vue#dbclick

  // EAOG 文件不能通过此方式重命名
  if (fileToRename.isEaog) {
    message.info('EAOG 文件名称与其根节点名称保持一致，请通过修改 EAOG 内容更改名称');
    return;
  }

  const newName = await prompt({
    title: '重命名',
    content: '请输入新名称:',
    defaultValue: fileToRename.meta.title
  }).catch(() => null);

  if (newName && newName !== fileToRename.meta.title) {
    await projectManager.renameFile(fileToRename.id, newName);
    message.success(`${fileToRename.type === 'directory' ? '文件夹' : '文件'}已重命名为"${newName}"`);
  }
};



// 删除文件或文件夹
const deleteFile = async (item: any) => {
  const fileToDelete = item.value;
  const isDirectory = fileToDelete.type === 'directory';
  const confirmMessage = isDirectory ?
    `确定要删除文件夹"${fileToDelete.meta.title}"及其所有内容吗？` :
    `确定要删除文件"${fileToDelete.meta.title}"吗？`;

  try {
    await confirm({
      title: '删除确认',
      content: confirmMessage
    })
    await projectManager.deleteFile(fileToDelete.id);
  } catch (e) {
    debug('删除操作已取消');
    return;
  }
  message.success(`${isDirectory ? '文件夹' : '文件'}"${fileToDelete.meta.title}"已删除`);
};

// 创建新文件夹
const createFolder = async () => {
  const folderName = await prompt({content: '请输入文件夹名称:'}).catch(() => null)
  if (folderName) {
    const parentId = currentFolder.value?.id;
    const parentPath = currentFolder.value!.path || '';
    const path = parentPath ? `${parentPath}/${folderName}` : `/${folderName}`;

    await projectManager.addFile({
      name: folderName,
      path: path,
      type: 'directory',
      projectId: 'default',
      parentId: parentId,
    });
  }
};

const getNodeClass = (treeNodeItem: FlattenedItem<Recordable<any>>) => {
  const file = treeNodeItem.value;
  return `group relative flex items-center cursor-pointer text-sm text-gray-700 ${(file.id === currentFile.value?.id ? '!bg-blue-100' : '')} hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-2`;
};

// 初始化项目数据
onMounted(async () => {
  await projectManager.initDB();
  await projectManager.createDefaultProject();
  await projectManager.loadProjectFiles();
});

</script>

<template>
  <div class="project-panel">
    <div class="flex justify-between items-center mb-4">
      <h3 class="font-medium">
        当前文件夹
        <span v-if="currentFolder" class="ml-2 text-sm text-gray-500">
          - {{ currentFolder.name }}
        </span>
      </h3>
      <div class="flex space-x-2">
        <button @click="createFolder" class="text-sm px-2 py-1 border rounded hover:bg-gray-100">
          新建文件夹
        </button>
        <button @click="createFile" class="text-sm px-2 py-1 border rounded hover:bg-gray-100">
          新建文件
        </button>
      </div>
    </div>

    <!-- 文件树 -->
    <VbenTree
      :tree-data="projectTree"
      :multiple="false"
      :bordered="true"
      :default-expanded-level="2"
      :get-node-class="getNodeClass"
      :children-field="'children'"
      value-field="key"
      label-field="meta.title"
      icon-field="meta.icon"
      @select="setCurrentFolderAndLoadFile"
      @dblclick="renameFile"
    >
      <!--   文件树列表项         -->
      <template #node="{ value }">
        <IconifyIcon v-if="value.meta?.icon" :icon="value.meta.icon"/>
        <span class="ml-1">{{ value.meta?.title }}</span>

        <div class="tree-actions hidden ml-auto group-hover:flex">
          <button
            @click.stop="deleteFile({value})"
            class="delete-btn ml-2 text-gray-500 hover:text-red-700"
          >
            <IconifyIcon icon="mdi:delete-outline"/>
          </button>
        </div>
      </template>
    </VbenTree>
  </div>
</template>

<style scoped>
:deep(.ant-tree-title) {
  .tree-actions {
    display: none;
    margin-left: 20px;
  }
}

:deep(.ant-tree-title:hover) {
  .tree-actions {
    display: flex;
    flex: auto;
    justify-content: flex-end;
    margin-left: 20px;
  }
}

:deep(.ant-tree-title) .file-node {
  color: #1890ff;
}

:deep(.ant-tree-node-content-wrapper) {
  display: flex;
  align-items: center;
}

:deep(.ant-tree-switcher-noop) {
  display: none;
}
</style>
