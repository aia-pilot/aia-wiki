<template>
  <VbenContextMenu
    :handler-data="selectedItem"
    :menus="contextMenus"
    :modal="false"
  >
    <div class="p-4 border rounded cursor-pointer">
      右键点击显示带二级菜单的上下文菜单
    </div>

    <!-- 手动构建二级菜单结构 -->
    <template #content>
      <ContextMenu>
        <ContextMenuTrigger as-child>
          <slot/>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem @click="handleView">查看</ContextMenuItem>
          <ContextMenuItem @click="handleEdit">编辑</ContextMenuItem>

          <!-- 二级菜单 -->
          <ContextMenuSub>
            <ContextMenuSubTrigger>更多操作</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem @click="handleCopy">复制</ContextMenuItem>
              <ContextMenuItem @click="handleMove">移动</ContextMenuItem>
              <ContextMenuItem @click="handleArchive">归档</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator/>
          <ContextMenuItem @click="handleDelete">删除</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </template>
  </VbenContextMenu>
</template>

<script setup lang="ts">
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuSeparator
} from '@vben-core/shadcn-ui';
import {ref} from "vue";

const selectedItem = ref({id: 1, name: '示例项目'});

const handleView = () => console.log('查看');
const handleEdit = () => console.log('编辑');
const handleCopy = () => console.log('复制');
const handleMove = () => console.log('移动');
const handleArchive = () => console.log('归档');
const handleDelete = () => console.log('删除');
</script>
