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
import {type EaogNode, isLeafNode} from './eaog-node';
// 导入lucide.ts中可用的图标
import {
  Circle,
  Check,
  Copy,
  ArrowLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  CircleX,
  Info,
  Expand
} from '@vben/icons';
// 组件属性
defineProps<{
  contextMenuNode: EaogNode | null;
  clipboardNode: EaogNode | null;
  // contextMenuKey?: number; // 用于强制更新菜单。 @toFix [在contextmenu出现后，再次右键，菜单位置不会跟随右键位置变化](https://deepwiki.com/search/contextmenu_0b63c8b3-fba8-4d39-afa1-3a8083c457d6)
}>();

// 组件事件
const emit = defineEmits<{
  'new-node': [position: 'before' | 'after' | 'child' | 'parent'];
  'edit-node': [];
  'copy-node': [withChildren: boolean];
  'paste-node': [position: 'before' | 'after' | 'child' | 'parent'];
  'delete-node': [deleteSubtree: boolean];
}>();

</script>

<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <!-- 触发区域 -->
      <slot/>
    </ContextMenuTrigger>
    <ContextMenuContent :class="$attrs.class">
      <!-- 新建节点 -->
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Circle class="mr-2 h-4 w-4 icon"/>
          新建节点
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem @click.prevent="() => emit('new-node', 'before')">
            <ArrowLeft class="mr-2 h-4 w-4 icon"/>
            在前面
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => emit('new-node','after')">
            <ChevronRight class="mr-2 h-4 w-4 icon"/>
            在后面
          </ContextMenuItem>
          <ContextMenuItem class="menu-item"
            @click.prevent="() => emit('new-node','child')"
            :disabled="isLeafNode(contextMenuNode)"
          >
            <ArrowDown class="mr-2 h-4 w-4 icon"/>
            作为子节点
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => emit('new-node','parent')">
            <ArrowUp class="mr-2 h-4 w-4 icon"/>
            作为父节点
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <!-- 编辑节点 -->
      <ContextMenuItem @click.prevent="emit('edit-node')">
        <Info class="mr-2 h-4 w-4 icon"/>
        编辑
      </ContextMenuItem>

      <!-- 复制节点 -->
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Copy class="mr-2 h-4 w-4 icon"/>
          复制
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem @click.prevent="() => emit('copy-node', false)">
            <Copy class="mr-2 h-4 w-4 icon"/>
            仅节点
          </ContextMenuItem>
          <ContextMenuItem class="menu-item"
            @click.prevent="() => emit('copy-node', true)"
            :disabled="isLeafNode(contextMenuNode)"
          >
            <Expand class="mr-2 h-4 w-4 icon"/>
            包含子树
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <!-- 粘贴节点 -->
      <ContextMenuSub>
        <ContextMenuSubTrigger :disabled="!clipboardNode">
          <Check class="mr-2 h-4 w-4 icon"/>
          粘贴
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem class="menu-item"
            @click.prevent="() => emit('paste-node','before')"
            :disabled="!clipboardNode"
          >
            <ArrowLeft class="mr-2 h-4 w-4 icon"/>
            粘贴到前面
          </ContextMenuItem>
          <ContextMenuItem class="menu-item"
            @click.prevent="() => emit('paste-node','after')"
            :disabled="!clipboardNode"
          >
            <ChevronRight class="mr-2 h-4 w-4 icon"/>
            粘贴到后面
          </ContextMenuItem>
          <ContextMenuItem class="menu-item"
            @click.prevent="() => emit('paste-node','child')"
            :disabled="!clipboardNode ||isLeafNode(contextMenuNode)"
          >
            <ArrowDown class="mr-2 h-4 w-4 icon"/>
            粘贴为子节点
          </ContextMenuItem>
          <ContextMenuItem class="menu-item"
            @click.prevent="() => emit('paste-node','parent')"
            :disabled="!clipboardNode || isLeafNode(clipboardNode)"
          >
            <ArrowUp class="mr-2 h-4 w-4 icon"/>
            粘贴为父节点
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSeparator/>

      <!-- 删除节点 -->
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <CircleX class="mr-2 h-4 w-4 icon"/>
          删除
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem class="menu-item"
            @click.prevent="() => emit('delete-node', false)"
            :disabled="isLeafNode(contextMenuNode)"
          >
            <Copy class="mr-2 h-4 w-4 icon"/>
            仅删除节点（保留子节点）
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => emit('delete-node', true)">
            <CircleX class="mr-2 h-4 w-4 icon"/>
            删除节点及子树
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  </ContextMenu>
</template>

<style scoped>
/* 菜单项样式 */
div[role="menuitem"] {
  cursor: pointer;
}

/* 菜单图标样式 */
div[role="menuitem"] .icon {
  color: #666; /* 暗灰色 */
  opacity: 0.85; /* 略微降低不透明度 */
}



/* 禁用菜单项 */
div[role="menuitem"][aria-disabled="true"] {
  color: #ccc; /* 浅灰色 */
  cursor: not-allowed; /* 禁用状态光标 */
}

/* 禁用菜单项图标 */
div[role="menuitem"][aria-disabled="true"] .icon {
  opacity: 0.3; /* 更低的不透明度 */
}

</style>
