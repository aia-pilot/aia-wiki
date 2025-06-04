<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <slot/>
    </ContextMenuTrigger>
    <ContextMenuContent>
      <!-- 新建节点 -->
      <ContextMenuSub>
        <ContextMenuSubTrigger>新建节点</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem @click.prevent="() => handleNewNode('before')">在前面</ContextMenuItem>
          <ContextMenuItem @click.prevent="() => handleNewNode('after')">在后面</ContextMenuItem>
          <ContextMenuItem
            @click.prevent="() => handleNewNode('child')"
            :disabled="!isContainerNode"
          >作为子节点
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => handleNewNode('parent')">作为父节点
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <!-- 编辑节点 -->
      <ContextMenuItem @click.prevent="handleEditNode">编辑</ContextMenuItem>

      <!-- 复制节点 -->
      <ContextMenuSub>
        <ContextMenuSubTrigger>复制</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem @click.prevent="() => handleCopyNode(false)">仅节点</ContextMenuItem>
          <ContextMenuItem
            @click.prevent="() => handleCopyNode(true)"
            :disabled="!hasChildren"
          >包含子树
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <!-- 粘贴节点 -->
      <ContextMenuSub>
        <ContextMenuSubTrigger :disabled="!clipboardNode">粘贴</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem
            @click.prevent="() => handlePasteNode('before')"
            :disabled="!clipboardNode"
          >粘贴到前面
          </ContextMenuItem>
          <ContextMenuItem
            @click.prevent="() => handlePasteNode('after')"
            :disabled="!clipboardNode"
          >粘贴到后面
          </ContextMenuItem>
          <ContextMenuItem
            @click.prevent="() => handlePasteNode('child')"
            :disabled="!clipboardNode || !isContainerNode"
          >粘贴为子节点
          </ContextMenuItem>
          <ContextMenuItem
            @click.prevent="() => handlePasteNode('parent')"
            :disabled="!clipboardNode"
          >粘贴为父节点
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSeparator/>

      <!-- 删除节点 -->
      <ContextMenuSub>
        <ContextMenuSubTrigger>删除</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem
            @click.prevent="() => handleDeleteNode(false)"
            :disabled="!hasChildren"
          >仅删除节点（保留子节点）
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => handleDeleteNode(true)">删除节点及子树
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  </ContextMenu>
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
  ContextMenuSeparator,
  VbenContextMenu
} from '@vben-core/shadcn-ui';
import {type EaogNode, isLeafNode} from './eaog-node';
import {computed} from 'vue';

// 组件属性
const props = defineProps<{
  contextMenuNode: EaogNode | null;
  clipboardNode: EaogNode | null;
}>();

// 组件事件
const emit = defineEmits<{
  'new-node': [position: 'before' | 'after' | 'child' | 'parent'];
  'edit-node': [];
  'copy-node': [withChildren: boolean];
  'paste-node': [position: 'before' | 'after' | 'child' | 'parent'];
  'delete-node': [deleteSubtree: boolean];
}>();

// 计算当前节点是否为容器节点（可以拥有子节点）
const isContainerNode = computed(() => {
  return props.contextMenuNode ? !isLeafNode(props.contextMenuNode) : false;
});

// 计算当前节点是否有子节点
const hasChildren = computed(() => isLeafNode(props.contextMenuNode));

// 处理节点操作函数
const handleNewNode = (position: 'before' | 'after' | 'child' | 'parent') => {
  emit('new-node', position);
};

const handleEditNode = () => {
  emit('edit-node');
};

const handleCopyNode = (withChildren: boolean) => {
  emit('copy-node', withChildren);
};

const handlePasteNode = (position: 'before' | 'after' | 'child' | 'parent') => {
  emit('paste-node', position);
};

const handleDeleteNode = (deleteSubtree: boolean) => {
  emit('delete-node', deleteSubtree);
};
</script>
