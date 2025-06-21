<script setup lang="ts">
/**
 * CP编辑器右侧栏组件
 * 包含节点详情和项目面板两个标签页
 */
import {computed} from 'vue';
import { JsonViewer } from '@vben/common-ui';
import { prompt, confirm } from '@vben/common-ui';
import {message} from 'ant-design-vue';
import { Tabs, TabsList, TabsTrigger, TabsContent, VbenTree } from '@vben-core/shadcn-ui';
import { IconifyIcon } from '@vben/icons';
import type { FlattenedItem } from 'radix-vue';
import type { Recordable } from '@vben/types';

import { currentNode } from '../models/editable-eaog-node';
import {projectManager, currentFolder} from '../models/project';

import Debug from 'debug';
const debug = Debug('aia:cp:editor-sidebar');

// 当前标签页
const defaultValue = 'node-details';

// 项目文件树数据
const projectTree = computed(() => projectManager.getTreeData());

// 新建Eaog表单
const props = defineProps<{
  eaogNodeForm: InstanceType<typeof EaogNodeForm> | undefined; // EaogNodeForm实例，用于新建Eaog
}>();


// 处理文件选择
const handleFileSelect = (item: FlattenedItem<Recordable<any>>) => {
  if (item) {
    const selectedFile = item.value;
    debug('选择文件:', selectedFile);
    projectManager.setCurrentFolder(selectedFile.id);

    if (selectedFile.type === 'file') {
      // 如果是EAOG文件且有内容，加载到编辑器
      emit('load-file', selectedFile.content);
    }
  }
};

// 删除文件或文件夹
const deleteFile = async (item: any) => {
  const fileToDelete = item.value;
  const isDirectory = fileToDelete.type === 'directory';
  const confirmMessage = isDirectory ?
    `确定要删除文件夹"${fileToDelete.meta.title}"及其所有内容吗？` :
    `确定要删除文件"${fileToDelete.meta.title}"吗？`;

 await confirm({
    title: '删除确认',
    content: confirmMessage
  }).catch(e => null);

  await projectManager.deleteFile(fileToDelete.id);
  message.success(`${isDirectory ? '文件夹' : '文件'}"${fileToDelete.meta.title}"已删除`);
};

// 创建新文件夹
const createFolder = async () => {
  const folderName = await prompt({content: '请输入文件夹名称:'}).catch(e => null)
  if (folderName) {
    const parentId = currentFolder.value?.id;
    const parentPath = currentFolder.value?.path || '';
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

// 创建新文件
const createFile = async () => {
  props.eaogNodeForm?.createEaog(); // 打开表单
};


// 定义组件事件
const emit = defineEmits(['load-file']);

</script>

<template>
  <div class="w-full h-full p-4 border rounded-md">
    <Tabs :default-value="defaultValue">
      <TabsList>
        <TabsTrigger value="node-details">节点详情</TabsTrigger>
        <TabsTrigger value="project-panel">项目面板</TabsTrigger>
      </TabsList>

      <!-- 节点详情面板 -->
      <TabsContent value="node-details" class="pt-4">
        <div v-if="currentNode" class="node-details">
          <div class="mb-4">
            <div class="mb-2">
              <span class="font-medium">名称：</span>
              <span>{{ currentNode.name }}</span>
            </div>
            <div class="mb-2">
              <span class="font-medium">类型：</span>
              <span>{{ currentNode.type }}</span>
            </div>
          </div>

          <!-- 使用JsonViewer展示完整节点信息 -->
          <div>
            <div class="font-medium mb-2">完整JSON数据：</div>
            <JsonViewer
              :value="currentNode"
              :expand-depth="2"
              copyable
              boxed
            />
          </div>
        </div>
        <div v-else class="text-gray-500">
          请点击左侧节点查看详情
        </div>
      </TabsContent>

      <!-- 项目面板 -->
      <TabsContent value="project-panel" class="pt-4">
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
            :get-node-class="() => 'group relative flex items-center cursor-pointer text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-2'"
            :children-field="'children'"
            value-field="key"
            label-field="meta.title"
            icon-field="meta.icon"
            @select="handleFileSelect"
          >
            <!--   文件树列表项         -->
            <template #node="{ value }">
              <IconifyIcon v-if="value.meta?.icon" :icon="value.meta.icon" />
              <span class="ml-1">{{ value.meta?.title }}</span>

              <div class="tree-actions hidden ml-auto group-hover:flex">
                <button
                  @click.stop="deleteFile({value})"
                  class="delete-btn ml-2 text-gray-500 hover:text-red-700"
                >
                  <IconifyIcon icon="mdi:delete-outline" />
                </button>
              </div>
            </template>
          </VbenTree>
        </div>
      </TabsContent>
    </Tabs>
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




.node-details {
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 0.25rem;
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
