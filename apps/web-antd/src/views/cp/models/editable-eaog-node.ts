import {ref} from 'vue';
// @ts-ignore 忽略导入的类型
import {cpEaogSchema, z} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog.zod.js";
// @ts-ignore 忽略导入的类型
import {uniqNameWithSequenceSuffix} from "../../../../../../../aia-infra/src/uniq-name.js";
// @ts-ignore
import {convertBriefEaog} from "../../../../../../../aia-se-comp/src/eaog/brief-eaog-convertor.js";
import {omit} from "lodash-es";
//@ts-ignore
import {Eaog} from "../../../../../../../aia-eaog/src/eaog.js";
import {getCleanObj} from "../utils/clean-obj";
import Debug from 'debug';
import {currentCP} from "./cp-editor-state";
import type {EaogNode} from "#/views/cp/models/types";
import {IntegratedCPManager} from "./integrated-cp";
import type {EditableCP} from "#/views/cp/models/editable-cp";
import {EditableIntegrationManager} from "#/views/cp/models/editable-integration-manager";
// 导入所需的具体函数
import * as treeUtils from "../utils/tree-utils";
// @ts-ignore 忽略导入的类型
const debug = Debug("aia:cp:eaog-node");

// 将isClicked从TRANSIENT_ATTRIBUTES中移除
const TRANSIENT_ATTRIBUTES = [
  'id', 'isNewlyModified', 'isSelected', 'isCollapsed', 'parent', 'cp',
  'integratedCPManager', 'integratedCPBeforeNode', 'integratedCPAfterNode', 'integratedCPReplaceNode',
  'integrationManager', 'ipath', 'hookManager', 'syncManager', 'briefPath'
];

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
  id: string = crypto.randomUUID(); // Vue框架缓存依据
  isNewlyModified = false; // 标记是否为新添加的节点，用于动画效果
  isSelected = false; // 标记是否被选中，Eaog Tree上可以有多个节点被选中
  isCollapsed = false; // 标记节点是否折叠子节点

  cp?: EditableCP; // 当前Eaog的CP（TRANSIENT)
  integrationManager?: EditableIntegrationManager | undefined; // 集成管理器，处理集成点的添加和查询
  ipath?: string; /** 集成路径 {@link CPIntegrationManager}，如何从顶层CP集成到当前CP（TRANSIENT）*/

  // 展示集成CP，包括action, hook, sideCP, frameworks等（TRANSIENT）
  integratedCPManager?: IntegratedCPManager; // 集成CP管理器，用于处理集成CP的逻辑
  integratedCPBeforeNode?: EditableEaogNode; // 前置的集成CP节点，用于展示
  integratedCPAfterNode?: EditableEaogNode; // 后置的集成CP节点，用于展示
  integratedCPReplaceNode?: EditableEaogNode; // 替换（本节点）的集成CP节点，用于展示

  get showNode(): EditableEaogNode {
    return this.integratedCPReplaceNode || this; // 如果有替换节点，则显示替换节点，否则显示当前节点
  }

  get isReplacedByIntegratedCP(): boolean {
    return !!this.integratedCPReplaceNode; // 如果有替换节点，则表示被集成CP替换
  }

  get showChildren(): EditableEaogNode[] {
    return [this.integratedCPBeforeNode, ...this.children, this.integratedCPAfterNode].filter(Boolean) as EditableEaogNode[] // 显示前置子节点、当前子节点和后置子节点
  }

  constructor(node: EaogNode, parent?: EditableEaogNode, cp?: EditableCP) {
    Object.assign(this, node); // 将传入的节点数据赋值给当前实例
    this.parent = parent; // 设置父节点
    this.cp = cp; // 设���当前Eaog的CP
    this.children = Array.isArray(node.children)
      ? node.children.map((child: EaogNode) => new EditableEaogNode(child, this, cp)) // 递归转换子节点
      : [];
    this.integratedCPManager = new IntegratedCPManager(this); // 创建集成CP管理器
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
   * 递归获取所有子孙���点
   */
  get descendants(): EditableEaogNode[] {
    return this.children.reduce((acc: EditableEaogNode[], child: EditableEaogNode) => {
      return acc.concat(child, child.descendants);
    }, []);
  }

  /**
   * 获取当前节点及其所有子孙节点
   */
  get nodes(): EditableEaogNode[] {
    return [this, ...this.descendants];
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
      treeUtils.traverseAll(this.root, node => {
        if (node !== this) {
          node.isSelected = false;
        }
      });
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
      treeUtils.traverseAll(this.root, node => {
        node.isSelected = false;
      });
    }
  }

  // 获取所有被选中的节点
  getSelectedNodes(): EditableEaogNode[] {
    const selected: EditableEaogNode[] = [];
    treeUtils.traverseAll(this.root, node => {
      if (node.isSelected) {
        selected.push(node);
      }
    });
    return selected;
  }

  traverseAll(callback: (node: EditableEaogNode) => void): void {
    treeUtils.traverseAll(this, callback);
  }

  findNode(predicate: (node: EditableEaogNode) => boolean): EditableEaogNode | null {
    return treeUtils.findNode(this, predicate);
  }

  // 设置新修改状态（用于动画效果）
  markAsNewlyModifiedForAWhile(duration = 2000): void {
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
    return this.isRoot ? [this] : [...(this.parent as EditableEaogNode).pathNodes, this]; // 获取从根节点到当前节点的路径节点数组
  }

  get path(): string {
    return this.pathNodes.map(node => node.name).join('/'); // 获取从根节点到当前节点的路径字符串
  }

  get previousSibling(): EditableEaogNode | undefined {
    if (!this.parent) {
      return undefined; // 如果没有父节点，则没有前一个兄弟节点
    }
    const index = this.indexInParent;
    return index > 0 ? this.parent.children[index - 1] : undefined; // 返回前一个兄弟节点或 undefined
  }

  get nextSibling(): EditableEaogNode | undefined {
    if (!this.parent) {
      return undefined; // 如果没有父节点，则没有下一个兄弟节点
    }
    const index = this.indexInParent;
    return index < this.parent.children.length - 1 ? this.parent.children[index + 1] : undefined; // 下一个兄弟节点或 undefined
  }

  get indexInParent(): number {
    return this.parent ? this.parent.children.indexOf(this) : -1; // 获取当前节点在父节点子节点数组中的索引
  }

  get sideCP():string | undefined {
    // TODO: 现在是tech spike，后继要改进
    const cp = this.root.cp?.sideCPs?.find(({launchPoint}) => {
      // syncPoints, cp;
      return launchPoint === this.name /** 注意：这个是hack，实际上重构 {@link Hook#findMatchedNode} 的算法 */
    })
    return cp?.cp; // 返回与当前节点匹配的辅助CP
  }

  /**
   * 深度克隆当前节点及其所有子节点
   * omit parent reference to avoid circular references
   */
  cloneDeep<T extends EditableEaogNode = EditableEaogNode>(): T {
    // 使用泛型和this类型确保返回类型与调用者类型一致
    const Constructor = this.constructor as new (data: EaogNode) => T;
    const clone = new Constructor(omit(this.toJSON(), ['children']));
    // 确保子节点也是使用正确的类型克隆
    clone.children = this.children.map(child => child.cloneDeep()) as T["children"];
    clone.children.forEach((child: EditableEaogNode) => child.parent = clone);
    if (this.isRoot) {
      clone.cp = this.cp; // 浅Copy CP
      clone.integratedCPManager = new IntegratedCPManager(clone); // 创建新的集成CP管理器
    }
    return clone;
  }

  toJSON(): object {
    const children = this.children.map(child => child.toJSON()); // 递归转换子节点为 JSON
    const res = {...omit(this, [...TRANSIENT_ATTRIBUTES, 'children']), children}; // 返回一个 JSON 对象，忽略 transient 和 children 属性
    return getCleanObj(res) as any; // 确保返回的对象没有 undefined 属性
  }

  equals(other: EditableEaogNode): boolean {
    return JSON.stringify(this.toJSON()) === JSON.stringify(other.toJSON()); // 比较两个节点的 JSON 表示是否相等
  }

  /**
   * 转换为表单值（编辑前、编辑后）
   * 必须转换，否则Vben Form会读取不到值。因为，表单绑定的currentNode<EditableEaogNode>，不是plain Object（有prototype链），通不过了 isPlainObject 检查，
   * @see defu@6.1.4/node_modules/defu/dist/defu.cjs#L5 由 packages/@core/ui-kit/form-ui/src/form-api.ts#L302 导入����用
   * @param formValues 表单值
   * @return 返回一个对象，包含当前节点的可编辑属性，如果没有修改则返回 undefined
   */
  getObjFromFormValues(formValues?: Partial<EaogNode>): object | undefined {
    if (!formValues) { // 编辑前，空表单，返回当前节点的可编辑属性
      return omit(this.toJSON(), ['children', 'id']); // children、id不可以被节点表单编辑，children通过上下文菜单操作。
    } else { // 编辑后，合并表单值
      formValues = getCleanObj(formValues, {null: true, emptyArray: false, emptyObject: false}); // 去掉表单中值为undefined、空数组、空对象的属性，保留null
      const isModified = Object.keys(formValues).some(key => formValues[key as keyof typeof formValues] !== (this as any)[key]);
      return isModified ? {...this.toJSON(), ...formValues} : undefined // 合并当前节点的属性和表单值
    }
  }

  mergeFormValues(values: Partial<EaogNode>): void {
    Object.assign(this, values);
  }

  // 树操作方法现在使用导出的函数
  addChild(child: EditableEaogNode, anchor?: EditableEaogNode, position: 'before' | 'after' = 'after'): void {
    treeUtils.addChild(this, child, anchor, position);
  }

  insert(newNode: EditableEaogNode | EaogNode, position: 'before' | 'after' | 'child' | 'parent'): EditableEaogNode {
    const nodeToInsert = newNode instanceof EditableEaogNode ? newNode : new EditableEaogNode(newNode, undefined, this.cp);

    const insertedNode = treeUtils.insert(this, nodeToInsert, position);

    // 特殊处理根节点更换情况
    if (position === 'parent' && this.isRoot && insertedNode !== this) {
      currentCP.value!.eaog = insertedNode;
    }

    return insertedNode;
  }

  replaceWith(newNode: EditableEaogNode | EaogNode): EditableEaogNode | undefined {
    const nodeToReplace = newNode instanceof EditableEaogNode ? newNode : new EditableEaogNode(newNode, undefined, this.cp);
    return treeUtils.replaceWith(this, nodeToReplace);
  }

  replaceWithPlaceHolder(): EditableEaogNode {
    const placeholder = createPlaceHolderNode(this.name);
    return this.replaceWith(placeholder)!;
  }

  shrinkSequentialParent(): boolean {
    return treeUtils.shrinkSequentialParent(this);
  }

  remove(deleteSubtree: boolean = true): EditableEaogNode {
    return treeUtils.remove(this, deleteSubtree);
  }

  getDescendantByPath(path: string): EditableEaogNode | null {
    return treeUtils.getDescendantByPath(this, path);
  }

  getNodeByPath(path: string): EditableEaogNode | null {
    return treeUtils.getNodeByPath(this.root, path);
  }

  moveTo(targetNode: EditableEaogNode, position: 'before' | 'after' | 'child'): boolean {
    return treeUtils.moveTo(this, targetNode, position);
  }
}

// 当前EAOG数据作为全局共享状态、当前被点击节点以及剪贴板节点等全局状态已移至cp-editor-state.ts

// 剪贴板中的节点，用于复制粘贴操作, 以及剪贴板新建
export const clipboardNode = ref<EditableEaogNode | null>(null);
export const currentNode = ref<EditableEaogNode | null>(null); // 导出当前选择的节点

export const validateEaog = (eaog: EditableEaogNode): z.SafeParseReturnType<any, any> => {
  for (const n of eaog.nodes) {
    // 补充验证cor节点children有choice，其余节点children没有choice
    if ((n.parent?.type === 'cor' && n.choice === undefined) || (n.parent?.type !== 'cor' && n.choice !== undefined)) {
      // 返回ZodError
      return {
        success: false,
        error: z.ZodError.create([{
          code: z.ZodIssueCode.custom,
          path: [n.path],
          message: n.parent?.type === 'cor' ? `条件节点的子节点必须有choice属性` : `非条件节点的子节点不能有choice属性`
        }])
      };
    }
  }
  return cpEaogSchema.safeParse(eaog.toJSON()); // 验证整个Eaog对象是否符合cpEaogSchema
};

export const zogErrorToString = (error: z.ZodError): string => {
  return error.errors.map((err: z.ZodIssue) => {
    return `${err.path.join('.')} - ${err.message}`;
  }).join('\n');
}

// 创建一个占位符节点，常用于替换节点时占住原有节点位置
export const createPlaceHolderNode = (name: string) => {
  return new EditableEaogNode({
    type: 'empty',
    name: `${name}-placeholder`,
    description: 'This is a placeholder node',
  });
}

/** 节点类型对应的颜色和图标 {@link allNodeTypes} */
export const nodeTypeUIConfig = {
  // 非叶（结构）节点，执行时不扩展
  sand:        { color: 'blue',    icon: '↓',  description: '顺序节点：子节点按顺序执行' }, // 改为 seq sequence？
  pand:        { color: 'green',   icon: '⇊',  description: '并行与节点：子节点并行执行，全部完成才继续' }, // 改为 par parallel
  cor:         { color: 'orange',  icon: '?',  description: '条件节点：根据条件选择一个子节点执行' }, //

  for:         { color: 'blue',    icon: '↴',  description: '循环节点：对列表元素依次执行' },
  pfor:        { color: 'green',   icon: '⇓',  description: '并行循环：对列表中的元素并行执行' },
  por:         { color: 'orange',  icon: '⤓',  description: '并行或节点：子节点中任意一个完成即可继续' },
  sitr:        { color: 'cyan',    icon: '⟳',  description: '顺序迭代：重复执行子节点' },
  pitr:        { color: 'cyan',    icon: '⤨',  description: '并行迭代：对列表元素并行执行' },

  // 叶（结构）节点，开发时扩展（Framework）
  'mount-point':   { color: 'magenta', icon: '↦⊐',  description: '框架上的挂载点' },

  // 叶（结构）节点，执行时动态扩展
  recursion:   { color: 'magenta', icon: '⟲',  description: '递归：调用其他节点（自身祖先）' },
  ref:         { color: 'magenta', icon: '↗︎',  description: '引用节点：引用执行其他节点（子树，非自身祖先）' },

  // 叶（行为）节点，执行时不扩展
  empty:       { color: 'gray',    icon: '◎',  description: '空节点：没有行为，仅用于占位，保持结构完整' },
  end:         { color: 'gray',     icon: '◉',  description: '结束节点：流程结束' },
  instruction: { color: 'purple',  icon: '▶',  description: '指令节点：执行具体操作' }, // @deprecated
  action:      { color: 'purple',  icon: '▶',  description: '指令节点：执行具体操作' },
  gen:         { color: 'green',  icon: '▷▷',  description: '生成节点：将生成新的子树，替换当前节点' },

  // gen, hook, wait, ctx


  _default:    { color: 'gray', icon: '◆', description: '未知节点类型' } // 未知节点，缺省配置
};
