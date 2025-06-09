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
import {z} from 'zod';
// @ts-ignore
import {
  cpEaogSchema,
  cpNodeSchema
} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog-schema.js";
import {convertBriefEaog} from "../../../../../../../aia-se-comp/src/eaog/brief-eaog-convertor.js";
import {toRaw} from "vue";
import {cloneDeepWith, omit} from "lodash-es";
import {IS_DEV} from "#/utils/aia-constants";

// 定义 EaogNode 类型为 cpNodeSchema 的推断类型
export type EaogNode = z.infer<typeof cpNodeSchema>;

/**
 * 将符合 EaogNode Schema 的节点数据转换为 EditableEaogNode 对象
 */
export const convertToEaogRoot = (node: any) => {
  node = IS_DEV ? convertBriefEaog(node) : node // @DEV，有时候导入的json是简写格式，我们需要转换为完整格式
  const res = cpEaogSchema.safeParse(node); // 验证节点数据是否符合 EaogNode Schema
  if (!res.success) {
    throw new Error(`Invalid EaogNode data: ${res.error.message}`);
  }
  return new EditableEaogNode(res.data); // 返回一个新的 EditableEaogNode 实例
}

const TRANSIENT_ATTRIBUTES = ['isNewlyAdded', 'isSelected', 'isClicked', 'parent'];
export class EditableEaogNode implements EaogNode {
  // 实现 EaogNode 的所有属性
  id!: string;
  type!: string;
  name!: string;
  description?: string;
  children: EditableEaogNode[];
  parent?: EditableEaogNode;

  // 其他 EditableEaogNode 的属性...
  isNewlyAdded = false; // 标记是否为新添加的节点
  isSelected = false; // 标记是否被选中，Eaog Tree上可以有多个节点被选中
  isClicked = false; // 标记是否被点击， Eaog Tree上只能有一个节点被点击

  constructor(node: EaogNode, parent?: EditableEaogNode) {
    Object.assign(this, node); // 将传入的节点数据赋值给当前实例
    this.parent = parent; // 设置父节点
    this.children = Array.isArray(node.children)
      ? node.children.map(child => new EditableEaogNode(child, this)) // 递归转换子节点
      : [];
  }

  // 点击节点
  click(shouldSelect = true, multiSelect = false): void {
    // 设置为点击状态
    if (this.root) {
      // 清除所有节点的点击状态
      this.root.traverseAll(node => { node.isClicked = false; });
    }
    this.isClicked = true;

    // 处理选中状态
    if (shouldSelect) {
      this.select(multiSelect);
    }
  }

  // 选中节点
  select(multiSelect = false): void {
    if (!multiSelect && this.root) {
      // 如果不是多选模式，清除所有节点的选中状态
      this.root.traverseAll(node => { node.isSelected = false; });
    }
    this.isSelected = !this.isSelected; // 切换选中状态
  }

  // 取消选中节点
  deselect(): void {
    this.isSelected = false;
  }

  // 取消所有选中
  deselectAll(): void {
    if (this.root) {
      this.root.traverseAll(node => { node.isSelected = false; });
    }
  }

  // 获取所有被选中的节点
  getSelectedNodes(): EditableEaogNode[] {
    const selected: EditableEaogNode[] = [];
    this.root.traverseAll(node => {
      if (node.isSelected) {
        selected.push(node);
      }
    });
    return selected;
  }

  // 遍历所有节点
  traverseAll(callback: (node: EditableEaogNode) => void): void {
    callback(this);
    for (const child of this.children) {
      child.traverseAll(callback);
    }
  }

  // 查找特定节点
  findNode(predicate: (node: EditableEaogNode) => boolean): EditableEaogNode | null {
    if (predicate(this)) {
      return this;
    }

    for (const child of this.children) {
      const found = child.findNode(predicate);
      if (found) {
        return found;
      }
    }

    return null;
  }

  // 设置新添加状态（用于动画效果）
  markAsNewlyAdded(duration=2000): void { // 2秒后自动清除新添加标记，与CSS动画时长一致
    this.isNewlyAdded = true;
    // 可以添加一个自动清除新添加状态的逻辑
    setTimeout(() => {
      this.isNewlyAdded = false;
    }, duration);
  }

  get isRoot(): boolean {
    return !this.parent; // 如果没有父节点，则为根节点
  }

  get root(): EditableEaogNode {
    return this.isRoot ? this : (this.parent as EditableEaogNode).root;
  }

  get pathNodes(): EditableEaogNode[] {
    return this.isRoot ? [this] : [...(this.parent as EditableEaogNode).pathNodes, this]; // 获取从根节点到当前节点的路径节点数���
  }

  get path(): string {
    return this.pathNodes.map(node => node.name).join('/'); // 获��从根节点到当前节点的路径字符串
  }

  get previousSibling(): EditableEaogNode | null {
    if (!this.parent) {
      return null; // 如果没有父节点，则没有前一个兄弟节点
    }
    const index = this.indexInParent;
    return index > 0 ? this.parent.children[index - 1] : null; // 返回前一个兄弟节点或 null
  }

  get nextSibling(): EditableEaogNode | null {
    if (!this.parent) {
      return null; // 如果没有父节点，则没有下一个兄弟节点
    }
    const index = this.indexInParent;
    return index < this.parent.children.length - 1 ? this.parent.children[index + 1] : null; // 返回下一个兄弟节点或 null
  }

  get indexInParent(): number {
    return this.parent ? this.parent.children.indexOf(this) : -1; // 获取当前节点在父节点子节点数组中的索引
  }

  /**
   * 深度克隆当前节点及其所有子节点
   * omit parent reference to avoid circular references
   */
  cloneDeep(): EditableEaogNode {
    // const raw = toRaw(this); // 获取当前节点的原始数据，拆除 Vue 响应式引用
    // const clone = cloneDeepWith(raw, (v, k) => TRANSIENT_ATTRIBUTES.includes(k) ? undefined : v); // 深度克隆，忽略 parent 属性
    // return new EditableEaogNode(clone as EaogNode); // 返回新的 EditableEaogNode 实例, parent will be undefined
    return new EditableEaogNode(this.toJSON() as EaogNode); // 直接使用 toJSON 方法转换为普通对象，然后创建新的 EditableEaogNode 实例
  }


  toJSON(): object {
    const children = this.children.map(child => child.toJSON()); // 递归转换子节点为 JSON
    return {...omit(this, [...TRANSIENT_ATTRIBUTES, 'children']), children}; // 返回一个 JSON 对象，忽略 transient 和 children 属性
  }

  equals(other: EditableEaogNode): boolean {
    if (!(other instanceof EditableEaogNode)) {
      return false; // 如果其他对象不是 EditableEaogNode 实例，返回 false
    }
    return JSON.stringify(this.toJSON()) === JSON.stringify(other.toJSON()); // 比较两个节点的 JSON 表示是否相等
  }

  /**
   * 保障子节点名称唯一。如果已经有同名子节点，则在名称后添加数字后缀（依次递增）。
   */
  _ensureChildWithUniqueName(child: EditableEaogNode): void {
    child.name = this._getUniqueName(child.name, this.children.map(c => c.name));
  }

  /**
   * 在原有名称基础上生成一个唯一的名称
   * @param name
   * @param usedNames
   */
  _getUniqueName(name: string, usedNames: string[]): string {
    if (!usedNames.includes(name)) {
      return name; // 如果名称未被使用，直接返回
    }
    // 如果名称已被使用，则在其后面添加数字后缀，直到找到一个未被使用的名称
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

  addChild(child: EditableEaogNode, anchor?: EditableEaogNode, position: 'before' | 'after' = 'after'): void {
    this._ensureChildWithUniqueName(child); // 确保子节点名称唯一
    if (anchor) {
      // 如果指定了锚点节点，则在锚点前或后插入
      const index = this.children.indexOf(anchor);
      if (index === -1) {
        throw new Error('Anchor node not found in children');
      }
      if (position === 'before') {
        this.children.splice(index, 0, child);
      } else { // 'after'
        this.children.splice(index + 1, 0, child);
      }
    } else {
      // 如果没有指定锚点，则直接添加到子节点列表末尾
      this.children.push(child);
    }
    child.parent = this; // 设置子节点的父节点为当前节点
  }

  /**
   * 在指定位置插入节点
   * @param newNode 要插入的新节点
   * @param position 插入位置: 'before' | 'after' | 'child' | 'parent'
   * @returns 新插入的节点
   */
  insert(newNode: EditableEaogNode | EaogNode, position: 'before' | 'after' | 'child' | 'parent'): void {
    newNode = newNode instanceof EditableEaogNode ? newNode : new EditableEaogNode(newNode); // 确保 newNode 是 EditableEaogNode 实例
    if (position === 'before' || position === 'after') {
      if (!this.parent) {
        throw new Error('Cannot insert sibling for root node');
      }

      this.parent.addChild(newNode, this, position); // 使用父节点的 addChild 方法插入新节点
    } else if (position === 'child') {
      this.addChild(newNode); // 直接添加为当前节点的子节点的最后一个
    } else if (position === 'parent') { // 新节点作为当前节点的父节点，插入当前节点的位置
      if (!Eaog.isCompositeType(newNode.type)) {
        throw new Error('Cannot promote non-composite node to parent');
      }
      if (!this.parent) {
        throw new Error('Cannot promote node to root');
      }
      this.parent.addChild(newNode, this, 'before'); // 在当前节点之前插入新节点
      this.remove(); // 从当前父节点中移除当前节点
      newNode.addChild(this); // 将当前节点添加为新节点的子节点
    }
    return newNode; // 返回新插入的节点
  }

  replace(newNode: EditableEaogNode | EaogNode): EditableEaogNode {
    const {previousSibling, nextSibling, parent} = this
    this.remove(); // 移除当前节点，先移除后加入，保障replace后的节点有正确的命名
    // 替换到原有位置
    return previousSibling?.insert(newNode, 'after') || nextSibling.insert(newNode, 'before') || parent?.insert(newNode, 'child') || null
  }

  /**
   * 移除当前节点
   * @param deleteSubtree 是否同时删除子树，如果为false则提升子节点到当前节点位置
   * @returns 被移除的节点
   */
  remove(deleteSubtree: boolean = true): EditableEaogNode {
    if (!this.parent) {
      throw new Error('Cannot remove root node');
    }

    const index = this.indexInParent;
    this.parent.children.splice(index, 1);

    if (!deleteSubtree && this.children.length > 0) {
      // 需要提升子节点，将子节点提升到父节点
      this.parent.children.splice(index, 0, ...this.children);
      // 更新子节点的父节点引用
      this.children.forEach(child => {
        child.parent = this.parent;
      });
    }

    // 清除被移除节点的父节点引用
    this.parent = undefined;

    return this;
  }

  getDescendantByPath(path: string): EditableEaogNode | null {
    const pathNodes = path.split('/').filter(Boolean); // 分割路径并过滤空字符串
    let currentNode: EditableEaogNode | null = this;

    for (const nodeName of pathNodes) {
      if (!currentNode || currentNode.name !== nodeName) {
        return null; // 如果当前节点不存在或名称不匹配，返回 null
      }
      currentNode = currentNode.children.find(child => child.name === nodeName) as EditableEaogNode || null; // 查找子节点
    }
    return currentNode; // 返回找���的节点或 null
  }

  getNodeByPath(path: string): EditableEaogNode | null {
    return this.root.getDescendantByPath(path); // 从根节点开始查找
  }
}
