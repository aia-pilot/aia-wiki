<script setup lang="ts">
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSub, ContextMenuSubTrigger,
  ContextMenuSubContent, ContextMenuSeparator
} from '@vben-core/shadcn-ui';
import {currentNode, EditableEaogNode} from '../models/editable-eaog-node';
// 导入lucide.ts中可用的图标
import {Circle, Check, Copy, ArrowLeft, ChevronRight, ArrowDown, ArrowUp, CircleX, Info, Expand} from '@vben/icons';
import {onMounted, onUnmounted, ref} from 'vue';

import {useHistory} from '../composables/use-eaog-history';

const history = useHistory();

import Debug from 'debug';
import EaogNodeForm from "#/views/cp/components/eaog-node-form.vue";

const debug = Debug('aia:cp-context-menu');

// 组件属性
const props = defineProps<{
  eaogNodeForm: InstanceType<typeof EaogNodeForm> | undefined; // EaogNodeForm实例，用于新建/编辑节点
}>();

// 组件内部状态
const clipboardNode = ref<EditableEaogNode | null>(null);
const clipboardWithChildren = ref<boolean>(false);

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
  if (currentNode.value.isRoot && position === 'parent') { // 如果是根节点，设置新节点为根节点
    currentNode.value = pastedNode;
  }
  pastedNode.markAsNewlyModifiedForAWhile()
  history.addToHistory();
};

const handleDeleteNode = (deleteSubtree: boolean) => {
  debug('删除节点', deleteSubtree ? '包含子树' : '仅节点', currentNode.value);
  const node = currentNode.value;
  if (!node) return;
  if (deleteSubtree) {
    if (node.isRoot) {
      currentNode.value = undefined;
    } else {
      node.remove(true);
    }
  } else { // 仅删除当前节点，保留子节点
    if (node.isRoot) { //此时仅有一个子节点，升级为根节点
      node.children.length === 1
      && (currentNode.value = node.children[0])
      && (currentNode.value.parent = undefined); // 升级为根节点
    } else {
      node.remove(false);
    }
  }
  history.addToHistory();
};

/**
 * 非叶子节点，和根节点的子节点数量大于1时，允许删除但保留子节点
 */
const canDeleteNodeButKeepChildren = () => {
  const n = currentNode.value!
  return (n.isContainer && !n.isRoot) || (n.isRoot && n.children.length <= 1)
}

const onKeyDown = (event: KeyboardEvent) => {
  const isModifier = event.ctrlKey || event.metaKey; // 同时支持 Ctrl 和 Command(⌘)

  if (event.key === 'Delete' || event.key === 'Backspace') {
    // 删除当前选中的节点
    handleDeleteNode(true);
    event.preventDefault(); // 阻止默认行为
  } else if (event.key === 'c' && isModifier) {
    // Ctrl/⌘ + C 复制节点
    handleCopyNode(true);
    event.preventDefault();
  } else if (event.key === 'v' && isModifier) {
    // Ctrl/⌘ + V 粘贴节点
    handlePasteNode('after');
    event.preventDefault();
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});

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
          <ContextMenuItem @click.prevent="() => eaogNodeForm?.addNode('before')">
            <ArrowLeft class="mr-2 h-4 w-4 icon"/>
            在前面
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => eaogNodeForm?.addNode('after')">
            <ChevronRight class="mr-2 h-4 w-4 icon"/>
            在后面
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => eaogNodeForm?.addNode('child')" :disabled="currentNode?.isLeaf">
            <ArrowDown class="mr-2 h-4 w-4 icon"/>
            作为子节点
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => eaogNodeForm?.addNode('parent')">
            <ArrowUp class="mr-2 h-4 w-4 icon"/>
            作为父节点
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <!-- 编辑节点 -->
      <ContextMenuItem @click.prevent="eaogNodeForm?.editNode()">
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
          <ContextMenuItem
            @click.prevent="() => handleCopyNode(true)"
            :disabled="currentNode?.isLeaf"
          >
            <Expand class="mr-2 h-4 w-4 icon"/>
            包含子节点
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
          <ContextMenuItem @click.prevent="() => handlePasteNode('before')" :disabled="!clipboardNode || currentNode?.isRoot">
            <ArrowLeft class="mr-2 h-4 w-4 icon"/>
            粘贴到前面
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => handlePasteNode('after')" :disabled="!clipboardNode || currentNode?.isRoot">
            <ChevronRight class="mr-2 h-4 w-4 icon"/>
            粘贴到后面
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => handlePasteNode('child')" :disabled="!clipboardNode || !currentNode?.isContainer">
            <ArrowDown class="mr-2 h-4 w-4 icon"/>
            粘贴为子节点
          </ContextMenuItem>
          <ContextMenuItem @click.prevent="() => handlePasteNode('parent')" :disabled="!clipboardNode || !clipboardNode?.isContainer">
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
          <ContextMenuItem @click.prevent="() => handleDeleteNode(false)" :disabled="!canDeleteNodeButKeepChildren()">
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
