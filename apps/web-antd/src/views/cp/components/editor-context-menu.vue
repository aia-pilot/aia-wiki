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
import {EditableEaogNode,} from '../models/eaog-node';
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
import Debug from 'debug';
import {computed, ref} from 'vue';

const debug = Debug('aia:cp-context-menu');

// 组件属性
const props = defineProps<{
  currentEaog: EditableEaogNode | null;
  eaogNodeForm: any;
}>();

// 组件内部状态
const currentNode = computed(() => props.currentEaog?.getClickedNode()); // 获取当前右键点击的节点
const clipboardNode = ref<EditableEaogNode | null>(null);
const clipboardWithChildren = ref<boolean>(false);


// 事件
const emit = defineEmits<{
  'add-history': []; // 添加历史记录
}>();


// 处理节点操作函数
const handleNewNode = (position: 'before' | 'after' | 'child' | 'parent') => {
  // 在这里实现新建节点的逻辑
  debug('新建节点', position, currentNode.value);
  props.eaogNodeForm?.open({
    onSuccess: (newNode: EditableEaogNode) => {
      currentNode.value.insert(newNode, position);
      newNode.markAsNewlyModifiedForAWhile();
      emit('add-history');
    }
  });
};

const handleEditNode = () => {
  debug('编辑节点', currentNode.value);
  props.eaogNodeForm?.open({
    node: currentNode.value,
    onSuccess: (isModified: boolean) => {
      if (!isModified) return; // 如果没有修改，直接返回
      currentNode.value.markAsNewlyModifiedForAWhile();
      emit('add-history');
    }
  });
};

const handleCopyNode = (withChildren: boolean) => {
  // 在这里实现复制节点的逻辑
  if (currentNode.value) {
    // 使用 EditableEaogNode 的 cloneDeep 方法复制节点
    const nodeCopy = currentNode.value.cloneDeep();
    if (!withChildren && nodeCopy.children) {
      nodeCopy.children = []; // 清除子节点
    }
    clipboardNode.value = nodeCopy;
    clipboardWithChildren.value = withChildren;
    debug('复制节点', withChildren ? '包含子树' : '仅节点', nodeCopy);
  }
};

const handlePasteNode = (position: 'before' | 'after' | 'child' | 'parent') => {
  // 在这里实现粘贴节点的逻辑
  debug('粘贴节点', position, clipboardNode.value);
  if (!clipboardNode.value || !currentNode.value) return;

  // 使用 EditableEaogNode 的 insert 方法插入新节点
  const pastedNode = clipboardNode.value.cloneDeep();
  currentNode.value.insert(pastedNode, position);
  pastedNode.markAsNewlyModifiedForAWhile()
  emit('add-history');
};

const handleDeleteNode = (deleteSubtree: boolean) => {
  // 在这里实现删除节点的逻辑
  debug('删除节点', deleteSubtree ? '包含子树' : '仅节点', currentNode.value);
  if (!currentNode.value) return;

  // 使用 EditableEaogNode 的 remove 方法删除节点
  currentNode.value.remove(deleteSubtree);
  emit('add-history'); // 添加当前状态到历史记录
};

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
          <ContextMenuItem @click.prevent="() => handleNewNode('before')">
            <ArrowLeft class="mr-2 h-4 w-4 icon"/>
            在前面
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => handleNewNode('after')">
            <ChevronRight class="mr-2 h-4 w-4 icon"/>
            在后面
          </ContextMenuItem>
          <ContextMenuItem class="menu-item"
                           @click.prevent="() => handleNewNode('child')"
                           :disabled="currentNode.isLeaf"
          >
            <ArrowDown class="mr-2 h-4 w-4 icon"/>
            作为子节点
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => handleNewNode('parent')">
            <ArrowUp class="mr-2 h-4 w-4 icon"/>
            作为父节点
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <!-- 编辑节点 -->
      <ContextMenuItem @click.prevent="handleEditNode">
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
          <ContextMenuItem @click.prevent="() => handleCopyNode(false)">
            <Copy class="mr-2 h-4 w-4 icon"/>
            仅节点
          </ContextMenuItem>
          <ContextMenuItem class="menu-item"
                           @click.prevent="() => handleCopyNode(true)"
                           :disabled="currentNode.isLeaf"
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
                           @click.prevent="() => handlePasteNode('before')"
                           :disabled="!clipboardNode"
          >
            <ArrowLeft class="mr-2 h-4 w-4 icon"/>
            粘贴到前面
          </ContextMenuItem>
          <ContextMenuItem class="menu-item"
                           @click.prevent="() => handlePasteNode('after')"
                           :disabled="!clipboardNode"
          >
            <ChevronRight class="mr-2 h-4 w-4 icon"/>
            粘贴到后面
          </ContextMenuItem>
          <ContextMenuItem class="menu-item"
                           @click.prevent="() => handlePasteNode('child')"
                           :disabled="!clipboardNode ||currentNode.isLeaf"
          >
            <ArrowDown class="mr-2 h-4 w-4 icon"/>
            粘贴为子节点
          </ContextMenuItem>
          <ContextMenuItem class="menu-item"
                           @click.prevent="() => handlePasteNode('parent')"
                           :disabled="!clipboardNode || clipboardNode.isLeaf"
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
                           @click.prevent="() => handleDeleteNode(false)"
                           :disabled="currentNode.isLeaf"
          >
            <Copy class="mr-2 h-4 w-4 icon"/>
            仅删除节点（保留子节点）
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => handleDeleteNode(true)">
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
