//@ts-ignore
import {Eaog} from "../../../../../../../aia-eaog/src/eaog.js";
import {getCleanObj} from "../utils/clean-obj";
import {z} from 'zod';
import {ref, type Ref} from 'vue'; // 添加Vue的ref引入
// @ts-ignore
import {cpEaogSchema, cpNodeSchema, compositeNodeSchema, baseNodeSchema} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog.zod.js";
// @ts-ignore
import {convertBriefEaog} from "../../../../../../../aia-se-comp/src/eaog/brief-eaog-convertor.js";
import {omit} from "lodash-es";
import {IS_DEV} from "#/utils/aia-constants";

import Debug from 'debug';
const debug = Debug("aia:cp:eaog-node");

// 定义 EaogNode 类型为 cpNodeSchema 的推断类型
export type EaogNode = z.infer<typeof cpNodeSchema>;

// 将isClicked从TRANSIENT_ATTRIBUTES中移除
const TRANSIENT_ATTRIBUTES = ['isNewlyModified', 'isSelected', 'isCollapsed', 'parent'];
export class EditableEaogNode implements EaogNode {
  // 实现 EaogNode 的所有属性
  type!: string;
  name!: string;
  description?: string;
  meta?: Record<string, any>; // 元数据，可能包含额外信息

  // 组合节点的属性
  children: EditableEaogNode[];
  parent?: EditableEaogNode; // EditableEaogNode属性（非EaogNode属性, TRANSIENT），用于维护树形结构

  // 递归节点的属性
  ref?: string;

  // 条件节点的��性
  condition?: any;
  params?: any; // 指令节点亦有
  choice?: string  // 条件节点的选择项，所有节点都有可能有

  // 指令节点的属性
  action?: any;
  results?: any;

  // 迭代器节点的属性
  item?: string | { contextName: string };
  items?: string | { contextName: string };

  // EditableEaogNode属性（非EaogNode属性, TRANSIENT）...
  isNewlyModified = false; // 标记是否为新添加的节点
  isSelected = false; // 标记是否被选中，Eaog Tree上可以有多个节点被选中
  // isClicked 属性已移除
  isCollapsed = false; // 标记节点是否折叠子节点

  constructor(node: EaogNode, parent?: EditableEaogNode) {
    Object.assign(this, node); // 将传入的节点数据赋值给当前实例
    this.parent = parent; // 设置父节点
    this.children = Array.isArray(node.children)
      ? node.children.map((child: EaogNode) => new EditableEaogNode(child, this)) // 递归转换子节点
      : [];
  }

  // 新增的 getter 方法
  get isLeaf(): boolean {
    return Eaog.isLeafType(this.type);
  }

  get isContainer(): boolean {
    return !this.isLeaf;
  }

  get isFramework(): boolean {
    return this.meta?.framework === true; // 判断是否为 Eaog Framework
  }

  get childrenDirection(): 'vertical' | 'horizontal' | '' {
    return this.isLeaf ? ''  // 叶子节点没有子节点，返回空字符串
      : Eaog.isConcurrentType(this.type) || Eaog.isConditionalType(this.type) ? 'horizontal'  // 并行和条件节点的子节点水平排列
      : 'vertical'; // 其余节点的子节点垂直排列
  }

  /**
   * 递归获取所有子孙节点
   */
  get descendants(): EditableEaogNode[] {
    return this.children.reduce((acc: EditableEaogNode[], child: EditableEaogNode) => {
      return acc.concat(child, child.descendants);
    }, []);
  }

  // 点击节点
  click(shouldSelect = true, multiSelect = false): void {
    // 设置为当前节点
    currentNode.value = this;

    // 处理选中状态
    if (shouldSelect) {
      this.select(multiSelect);
    }
  }

  // 选中节点
  select(multiSelect = false): void {
    if (!multiSelect && this.root) {
      // 如果不是多选模式，清除所有其它节点的选中状态
      this.root.traverseAll(node => {
        if (node !== this) {
          node.isSelected = false;
        }
      })
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

  // getClickedNode函数已从类中移除

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

  // 设置新修改状态（用于动画效果）
  markAsNewlyModifiedForAWhile(duration=2000): void {
    this.isNewlyModified = true;
    // 到时（2秒）取消。2秒，与CSS动画时长一致。
    setTimeout(() => {
      this.isNewlyModified = false;
    }, duration);
  }

  // 切换折叠状态
  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
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

  get previousSibling(): EditableEaogNode | undefined  {
    if (!this.parent) {
      return undefined; // 如果没有父节点，则没有前一个兄弟节点
    }
    const index = this.indexInParent;
    return index > 0 ? this.parent.children[index - 1] : undefined; // 返回前一个兄弟节点或 null
  }

  get nextSibling(): EditableEaogNode | undefined {
    if (!this.parent) {
      return undefined; // 如果没有父节点，则没有下一个兄弟节点
    }
    const index = this.indexInParent;
    return index < this.parent.children.length - 1 ? this.parent.children[index + 1] : undefined; // ���回下一个兄弟节点或 null
  }

  get indexInParent(): number {
    return this.parent ? this.parent.children.indexOf(this) : -1; // 获取当前节点在父节点子节点数组中的索引
  }

  /**
   * 深度克隆当前节点及其所有子节点
   * omit parent reference to avoid circular references
   */
  cloneDeep(): EditableEaogNode {
    const clone = new this.constructor(omit(this.toJSON(), ['children']));
    clone.children = this.children.map(child => child.cloneDeep());
    clone.children.forEach(child => child.parent = clone);
    return clone;
  }


  toJSON(): object {
    const children = this.children.map(child => child.toJSON()); // 递归转换子节点为 JSON
    const res = {...omit(this, [...TRANSIENT_ATTRIBUTES, 'children']), children}; // 返回一个 JSON 对象，忽略 transient 和 children 属性
    return getCleanObj(res) as any; // 确保返回的对象没有 undefined 属性
  }

  equals(other: EditableEaogNode): boolean {
    if (!(other instanceof EditableEaogNode)) {
      return false; // 如果其他对象不是 EditableEaogNode 实例，返回 false
    }
    return JSON.stringify(this.toJSON()) === JSON.stringify(other.toJSON()); // 比较两个节点的 JSON 表示是否相等
  }

  /**
   * 转换为表单值（编辑前、编辑后）
   * 必须转换，否则Vben Form会读取不到值���因为，EditableEaogNode不是plain Object（有prototype链），通不过了 isPlainObject 检查，
   * @see defu@6.1.4/node_modules/defu/dist/defu.cjs#L5 由 packages/@core/ui-kit/form-ui/src/form-api.ts#L302 导入使用
   * @param values 表单值
   * @return 返回一个对象，包含当前节点的可编辑属性，如果没有修改则返回 undefined
   */
  getFormValues(values: Partial<EaogNode> | undefined): object | undefined {
    if (!values) { // 编辑前，返回当前节点的可编辑属性
      return omit(this.toJSON(), ['children', 'id']); // children、id不可以被节点表单编辑，children通过上下文菜单操作。
    } else { // 编辑后，合并表单值
      values = getCleanObj(values, {null: true, emptyArray: false, emptyObject: false}); // 去掉表单中值为undefined、空数组、空对象的属性，保留null
      const isModified = Object.keys(values).some(key => values[key as keyof typeof values] !== (this as any)[key]);
      return isModified ? {...this.toJSON(), ...values} : undefined // 合并当前节点的属性和表单值
    }
  }

  mergeFormValues(values: Partial<EaogNode>): void {
    Object.assign(this, values);
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
      // 如果没有指定锚点，则直接添加到子节点��表末尾
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
  insert(newNode: EditableEaogNode | EaogNode, position: 'before' | 'after' | 'child' | 'parent'): EditableEaogNode {
    newNode = newNode instanceof EditableEaogNode ? newNode : new EditableEaogNode(newNode); // 确保 newNode 是 EditableEaogNode 实例
    if (position === 'before' || position === 'after') {
      if (!this.parent) {
        throw new Error('Cannot insert sibling for root node');
      }

      this.parent.addChild(newNode, this, position); // 使用父节点的 addChild 方法插入新节点
    } else if (position === 'child') {
      this.addChild(newNode); // 直接添加为当前节点的子节点的最���一个
    } else if (position === 'parent') { // 新节点作为当前节点的父节点，插入当前节点的位置
      if (!Eaog.isCompositeType(newNode.type)) {
        throw new Error('Cannot promote non-composite node to parent');
      }
      if (!this.parent) {
        debug('更换根节点', newNode, this);
        currentEaog.value = newNode; // 如果当前节点是根节点，则更新当前Eaog
      } else {
        this.parent.addChild(newNode, this, 'before'); // 在当前节点之前插入新节点
        this.remove(); // 从当前父节点中移除当前节点
      }
      newNode.addChild(this); // 将当前节点添加为新节点的子节点
    }
    return newNode; // 返回新插入的节点
  }

  replaceWith(newNode: EditableEaogNode | EaogNode): EditableEaogNode | undefined {
    const {previousSibling, nextSibling, parent} = this
    this.remove(); // 移除当前节点，先移除后加入，保障replace后的节点有正确的命名
    // 替换到原有位置
    return previousSibling?.insert(newNode, 'after') || nextSibling?.insert(newNode, 'before') || parent?.insert(newNode, 'child') || undefined
  }

  replaceWithPlaceHolder(): EditableEaogNode {
    const placeholder = createPlaceHolderNode(this.name); // 创建一个占位符节点
    return this.replaceWith(placeholder)!; // 替换当前节点为占位符
  }

  /**
   * 如果当前节点是sequential的，其父节点也是sequential的，则将当前节点的所有子节点提升到父节点位置，取代当前节点。
   */
  shrinkSequentialParent(): boolean {
    if (!this.parent || !Eaog.isSequentialType(this.parent.type) || !Eaog.isSequentialType(this.type)) {
      debug('Cannot shrink non-sequential parent or node', this, this.parent);
      return false
    }
    this.remove(false); // 不删除子树，只提升子节点
    return true
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

  /**
   * 根据路径获取后代节点
   * @param path 路径字符串，格式为 "node1/node2/node3"
   * @returns 找到的子节点或 null
   */
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

  /**
   * ���据路径获取节点
   * @param path 路径字符串，格式为 "/node1/node2/node3"
   * @returns ��到的节点或 null
   */
  getNodeByPath(path: string): EditableEaogNode | null {
    return this.root.getDescendantByPath(path); // 从根节点开始查找
  }
}

// 当前EAOG数据作为全局共享状态
export const currentEaog: Ref<EditableEaogNode | null> = ref(null);

// 当前被点击的节点
export const currentNode: Ref<EditableEaogNode | null> = ref(null);

/**
 * 更新当前EAOG数据
 * @param newCurrentEaog - 新的当前Eaog节点, 为undefined时表示不改动当前Eaog对象，但其属性（含子节点）已被修改。
 */
export const updateCurrentEaog = (newCurrentEaog: EditableEaogNode | undefined) => {
  if (newCurrentEaog) {
    currentEaog.value = newCurrentEaog;
    // 当更新EAOG对象时重置currentNode
    currentNode.value = null;
  }
  debug('更新Eaog:', newCurrentEaog);
};

export const validateEaog = (eaog: EaogNode): z.SafeParseReturnType<EaogNode, z.ZodError> => {
  return cpEaogSchema.safeParse(eaog); // 验证 EAOG 数据是否符合 cpEaogSchema
}

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


// 创建一个占位符节点，常用于替换节点时占住原有节点位置
export const createPlaceHolderNode = (name: string) => {
  return new EditableEaogNode({
    type: 'empty',
    name: `${name}-placeholder`,
    description: 'This is a placeholder node',
  });
}

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
