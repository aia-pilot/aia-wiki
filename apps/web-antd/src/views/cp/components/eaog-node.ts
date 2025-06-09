
//@ts-ignore
import {Eaog} from "../../../../../../../aia-eaog/src/eaog.js";

// 节点类型对应的颜色和图标
export const nodeTypeUIConfig = {
  sand: {color: 'blue', icon: '↓', description: '顺序节点：子节点按顺序执行'},
  pand: {color: 'green', icon: '⇉', description: '并行与节点：子节点并行执行，全部完成才继续'},
  pfor: {color: 'green', icon: '⇉', description: '并行循环：对列表元素并行执行'},
  cor: {color: 'orange', icon: '?', description: '条件节点：根据条件选择一个子节点执行'},
  instruction: {color: 'purple', icon: '◉', description: '指令节点：执行具体操作'},
  sitr: {color: 'cyan', icon: '↻', description: '顺序迭代：重复执行子节点'},
  recursion: {color: 'magenta', icon: '↺', description: '递归：调用其他节点'}
};
// 根据节点类型判断子节点的排列方向
export const getChildrenDirection = (nodeType: string): 'vertical' | 'horizontal' | '' => {
  return Eaog.isLeafType(nodeType) ? ''  // 叶子节点没有子节点，返回空字符串
    : Eaog.isConcurrentType(nodeType) || Eaog.isConditionalType(nodeType) ? 'horizontal'  // 并行和条件节点的子节点水平排列
      : 'vertical'; // 其余节点的子节点垂直排列
};

export const isLeafNode = (node: any): boolean => {
  return Eaog.isLeafType(node?.type);
}

export const isContainerNode = (node: any): boolean => {
  return !isLeafNode(node);
}

/**
 * EAOG示例用例集
 * 用于驱动CP可视化组件的开发
 */

/**
 * 定义 EAOG 节点类型接口
 * TODO：按照 eaog.zod.js 中的定义
 */

// eaog.types.ts
import { z } from 'zod';
// @ts-ignore
import {cpNodeSchema} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog-schema.js";
import {toRaw} from "vue";
import {cloneDeep} from "lodash-es";

// const uiNodeSchema = nodeSchema.extend({
//   // EaogNode在UI上的交互属性
//   isSelected: z.boolean().default(false).describe('节点是否被选中'),
// });
//
// export type EaogNode = z.infer<typeof uiNodeSchema>;
export type EaogNode = z.infer<typeof cpNodeSchema>;


export const cloneDeepEaogNode = (node: EaogNode): EaogNode => {
  // const watReactive = isReactive(node);
  const raw = toRaw(node);
  const clone = cloneDeep(raw);
  return clone as EaogNode; // 确保返回类型正确
  // return watReactive ? reactive(clone) : clone;
}

export const insertNode = (rootNode: EaogNode, currentNode: EaogNode, newNode: EaogNode, position: 'before' | 'after' | 'child' | 'parent'): EaogNode => {
  if (position === 'before' || position === 'after') {
    insertNodeAsSibling(rootNode, currentNode, newNode, position);
  } else { // 'child' 或 'parent'
    insertNodeAsParentOrChild(rootNode, currentNode, newNode, position);
  }
}


export const insertNodeAsSibling = (rootNode: EaogNode, currentNode: EaogNode, newNode: EaogNode, position: 'before' | 'after'): EaogNode => {
  const parentNode = getParentNode(rootNode, currentNode);
  if (!parentNode) {
    throw new Error('Parent node not found');
  }

  if (parentNode.children.includes(newNode)) {
    throw new Error('New node is already a child of the current node');
  }

  const index = parentNode.children.indexOf(currentNode);
  if (position === 'before') {
    parentNode.children.splice(index, 0, newNode); // 在当前节点前插入新节点
  } else if (position === 'after') {
    parentNode.children.splice(index + 1, 0, newNode); // 在当前节点后插入新节点
  } else {
    throw new Error('Invalid position specified');
  }
}

export const insertNodeAsParentOrChild = (rootNode: EaogNode, currentNode: EaogNode, newNode: EaogNode, position: 'child' | 'parent'): EaogNode => {
  if (position === 'child') { // 将新节点作为当前节点的子节点
    currentNode.children.push(newNode);
  } else if (position === 'parent') { // 将当前节点作为新节点的子节点，然后替换到当前节点的位置
    const parentNode = getParentNode(rootNode, currentNode);
    if (!parentNode) {
      throw new Error('Parent node not found');
    }

    // 将当前节点从父节点中移除
    const index = parentNode.children.indexOf(currentNode);
    parentNode.children.splice(index, 1);

    // 将新节点作为当前节点的父节点，并替换到当前节点的位置
    newNode.children.push(currentNode);
    parentNode.children.splice(index, 0, newNode);
  } else {
    throw new Error('Invalid position specified');
  }
}

export const removeNode = (rootNode: EaogNode, currentNode: EaogNode, deleteSubtree: boolean ): EaogNode | null => {
  const parentNode = getParentNode(rootNode, currentNode);
  if (!parentNode) {
    throw new Error('Parent node not found');
  }

  const index = parentNode.children.indexOf(currentNode);
  parentNode.children.splice(index, 1); // 从父节点的子节点中移除
  if (!deleteSubtree && currentNode.children.length > 0) {
    // 需要提升子节点，将子节点提升到父节点
    parentNode.children.splice(index, 0, ...currentNode.children);
  }
  return currentNode; // 返回被移除的节点
}

const getParentNode = (root: EaogNode, node: EaogNode): EaogNode | null => {
  if (root === node) {
    return null; // 根节点没有父节点
  } else if (root.children && root.children.includes(node)) {
    return root; // 找到父节点
  } else if (root.children) {
    for (const child of root.children) {
      const parent = getParentNode(child, node);
      if (parent) {
        return parent; // 递归查找子节点
      }
    }
  } else {
    return null; // 没有子节点，返回 null
  }
}
