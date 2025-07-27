import Debug from 'debug';
import type { EditableEaogNode } from '../models/editable-eaog-node';
import { uniqNameWithSequenceSuffix } from "../../../../../../../aia-infra/src/uniq-name.js";
//@ts-ignore
import { Eaog } from "../../../../../../../aia-eaog/src/eaog.js";

const debug = Debug("aia:cp:tree-utils");

/**
 * 保障子节点名称唯一。如果已经有同名子节点，则在名称后添加数字后缀（依次递增）。
 */
export function ensureChildWithUniqueName(child: EditableEaogNode, siblings: EditableEaogNode[]): void {
  child.name = uniqNameWithSequenceSuffix(child.name, siblings.map(c => c.name));
}

/**
 * 在原有名称基础上生成一个唯一的名称
 * @param name
 * @param usedNames
 */
export function getUniqueName(name: string, usedNames: string[]): string {
  if (!usedNames.includes(name)) {
    return name; // 如果名称未被使用，直接返回
  }
  // 如果名称已被使用，则在其后面添加数字后缀，直到找到一个未被使用��名称
  const regex = new RegExp(`^${name}-(\\d+)?$`);
  const existingNames = usedNames.filter(n => regex.test(n));
  const maxIndex = existingNames.reduce((max, n) => {
    const match = n.match(regex);
    if (match && match[1]) {
      const index = parseInt(match[1], 10);
      return Math.max(max, index);
    }
    return max;
  }, -1);
  return `${name}-${maxIndex + 1}`; // 返回新的唯一名称
}

/**
 * 添加子节点
 */
export function addChild(parent: EditableEaogNode, child: EditableEaogNode, anchor?: EditableEaogNode, position: 'before' | 'after' = 'after'): void {
  ensureChildWithUniqueName(child, parent.children); // 确保子节点名称唯一
  if (anchor) {
    // 如果指定了锚点节点，则在锚点前或后插入
    const index = parent.children.indexOf(anchor);
    if (index === -1) {
      throw new Error('Anchor node not found in children');
    }
    if (position === 'before') {
      parent.children.splice(index, 0, child);
    } else { // 'after'
      parent.children.splice(index + 1, 0, child);
    }
  } else {
    // 如果没有指定锚点，则直接添加到子节点列表末尾
    parent.children.push(child);
  }
  child.parent = parent; // 设置子节点的父节点为当前节点
}

/**
 * 在指定位置插入节点
 * @param targetNode 目标节点
 * @param newNode 要插入的新节点
 * @param position 插入位置: 'before' | 'after' | 'child' | 'parent'
 * @returns 新插入的节点
 */
export function insert(targetNode: EditableEaogNode, newNode: EditableEaogNode, position: 'before' | 'after' | 'child' | 'parent'): EditableEaogNode {
  if (position === 'before' || position === 'after') {
    if (!targetNode.parent) {
      throw new Error('Cannot insert sibling for root node');
    }

    addChild(targetNode.parent, newNode, targetNode, position); // 在目标节点前后插入新节点
  } else if (position === 'child') {
    addChild(targetNode, newNode); // 添加为目标节点的子节点
  } else if (position === 'parent') { // 新节点作为目标节点的父节点
    if (!Eaog.isCompositeType(newNode.type)) {
      throw new Error('Cannot promote non-composite node to parent');
    }

    if (!targetNode.parent) {
      debug('更换根节点', newNode, targetNode);
      addChild(newNode, targetNode);
      // 注意：更新根节点需要在调用处额外处理
      return newNode;
    } else {
      addChild(targetNode.parent, newNode, targetNode, 'before'); // 在目标节点之前插入新节点
      remove(targetNode); // 从当前父节点中移除目标节点
      addChild(newNode, targetNode); // 将目标节点添加为��节点的子节点
    }
  }
  return newNode; // 返回新插入的节点
}

/**
 * 替换节点
 * @param oldNode 要替换的节点
 * @param newNode 替换用的新节点
 * @returns 新节点或undefined（如果替换失败）
 */
export function replaceWith(oldNode: EditableEaogNode, newNode: EditableEaogNode): EditableEaogNode | undefined {
  const {previousSibling, nextSibling, parent} = oldNode;
  remove(oldNode); // 移除当前节点，先移除后加入，保障replace后的节点有正确的命名

  // 替换到原有位置
  if (previousSibling) {
    return insert(previousSibling, newNode, 'after');
  } else if (nextSibling) {
    return insert(nextSibling, newNode, 'before');
  } else if (parent) {
    return insert(parent, newNode, 'child');
  }
  return undefined;
}

/**
 * 如果当前节点是sequential的，其父节点也是sequential的，则将当前节点的所有子节点提升到父节点位置，取代当前节点。
 */
export function shrinkSequentialParent(node: EditableEaogNode): boolean {
  if (!node.parent || !Eaog.isSequentialType(node.parent.type) || !Eaog.isSequentialType(node.type)) {
    debug('Cannot shrink non-sequential parent or node', node, node.parent);
    return false;
  }
  remove(node, false); // 不删除子树，只提升子节点
  return true;
}

/**
 * 移除节点
 * @param node 要移除的节点
 * @param deleteSubtree 是否同时删除子树，如果为false则提升子节点到当前节点位置
 * @returns 被移除的节点
 */
export function remove(node: EditableEaogNode, deleteSubtree: boolean = true): EditableEaogNode {
  if (!node.parent) {
    throw new Error('Cannot remove root node');
  }

  const parent = node.parent;
  const index = parent.children.indexOf(node);
  parent.children.splice(index, 1);

  if (!deleteSubtree && node.children.length > 0) {
    // 需要提升子节点，将子节点提升到父节点
    parent.children.splice(index, 0, ...node.children);
    // 更新子节点的父节点引用
    node.children.forEach(child => {
      child.parent = parent;
    });
  }

  // 清除被移除节点的父节点引用
  delete node.parent;

  return node;
}

/**
 * 根据路径获取后代节点
 * @param node 起始节点
 * @param path 路径字符串，格式为 "node1/node2/node3"
 * @returns 找到的子节点或 null
 */
export function getDescendantByPath(node: EditableEaogNode, path: string): EditableEaogNode | null {
  const pathNodes = path.split('/').filter(Boolean); // 分割路径并过滤空字符串

  // 空路径返回当前节点
  if (pathNodes.length === 0) {
    return node;
  }

  let currentNode: EditableEaogNode = node;

  // 遍历路径节点名称
  for (let i = 0; i < pathNodes.length; i++) {
    const nodeName = pathNodes[i];

    // 在当前层次查找匹配名称的子节点
    const childNode = currentNode.children.find(child => child.name === nodeName);

    if (!childNode) {
      debug(`找不到名为 ${nodeName} 的子节点，在路径 ${path} 中，当前节点是 ${currentNode.name}`);
      return null;
    }

    currentNode = childNode;
  }

  return currentNode;
}

/**
 * 根据路径获取节点
 * @param rootNode 根节点
 * @param path 路径字符串，格式如 "/root/node1/node2" 或 "root/node1/node2"
 * @returns 找到的节点或 null
 */
export function getNodeByPath(rootNode: EditableEaogNode, path: string): EditableEaogNode | null {
  // 去除开头的斜杠
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;

  // 拆分路径
  const pathParts = cleanPath.split('/').filter(Boolean);

  if (pathParts.length === 0) {
    return null;
  }

  // 首先检查根节点名称是否匹配
  if (pathParts[0] !== rootNode.name) {
    debug(`根节点名称不匹配: 期望 ${pathParts[0]}，实际 ${rootNode.name}`);
    return null;
  }

  // 从根节点开始，顺着路径查找
  let currentNode: EditableEaogNode = rootNode;

  for (let i = 1; i < pathParts.length; i++) {
    const childName = pathParts[i];
    const childNode = currentNode.children.find(child => child.name === childName);

    if (!childNode) {
      debug(`在路径 ${path} 中找不到子节点 ${childName}`);
      return null;
    }

    currentNode = childNode;
  }

  return currentNode;
}

/**
 * 遍历所有节点
 * @param node 起始��点
 * @param callback 回调函数
 */
export function traverseAll(node: EditableEaogNode, callback: (node: EditableEaogNode) => void): void {
  callback(node);
  for (const child of node.children) {
    traverseAll(child, callback);
  }
}

/**
 * 查找特定节点
 * @param node 起始节点
 * @param predicate 断言函数
 * @returns 符合条件的节点或null
 */
export function findNode(node: EditableEaogNode, predicate: (node: EditableEaogNode) => boolean): EditableEaogNode | null {
  if (predicate(node)) {
    return node;
  }

  for (const child of node.children) {
    const found = findNode(child, predicate);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * 移动节点到新的位置
 * @param sourceNode 源节点
 * @param targetNode 目标节点
 * @param position 移动位置: 'before' | 'after' | 'child'
 * @returns 是否成功移动
 */
export function moveTo(sourceNode: EditableEaogNode, targetNode: EditableEaogNode, position: 'before' | 'after' | 'child'): boolean {
  // 防止将节点移动到自己
  if (sourceNode === targetNode) {
    return false;
  }

  // 防止将节点移动到自己的子节点中（会造成循环引用）
  if (position === 'child') {
    // 获取源节点的所有后代
    const descendants: EditableEaogNode[] = [];
    traverseAll(sourceNode, node => {
      if (node !== sourceNode) {
        descendants.push(node);
      }
    });

    if (descendants.includes(targetNode)) {
      return false;
    }
  }

  remove(sourceNode);
  insert(targetNode, sourceNode, position);
  return true; // 成功移动
}
