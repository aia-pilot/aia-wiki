import {z} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog.zod.js";
import type {SafeParseReturnType, ZodError, ZodIssue} from "zod";
// @ts-ignore 忽略导入的类型
import {cpEaogSchema} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog.zod.js";
// @ts-ignore 忽略导入的类型
import {uniqNameWithSequenceSuffix} from "../../../../../../../aia-infra/src/uniq-name.js";
// @ts-ignore
import {convertBriefEaog} from "../../../../../../../aia-se-comp/src/eaog/brief-eaog-convertor.js";
import {omit} from "lodash-es";
//@ts-ignore
import {Eaog} from "../../../../../../../aia-eaog/src/eaog.js";
import {getCleanObj} from "../utils/clean-obj";
import Debug from 'debug';
import type {EaogNode} from "#/views/cp/models/types";
import * as treeUtils from "../utils/tree-utils";
import {EditableEaogNodeUI} from "#/views/cp/viewmodels/editable-eaog-node-ui";
import {EditableIntegrationManager, ShowAtType} from "#/views/cp/models/editable-integration-manager";
import type {EditableCP} from "#/views/cp/viewmodels/editable-cp";
// @ts-ignore
const debug = Debug("aia:cp:eaog-node");


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

  // 条件节点的属性
  condition?: any;
  params?: any; // 指令节点亦有
  choice?: string  // 条件节点的选择项，所有节点都有可能有

  // 指令节点的属性
  action?: any;
  results?: any;

  // 迭代器节点的属性
  item?: string | { contextName: string };
  items?: string | { contextName: string };

  // Transient properties
  id: string = crypto.randomUUID(); // 唯一标识符，使用UUID生成
  _isEditableEaogNode = true; // 标记当前节点为可编辑的Eaog节点, reactive时， instanceof反射不好使

  cp?: EditableCP // 所属CP
  ui: EditableEaogNodeUI; // UI交互状态和行为，EditableEaogNodeUI实例

  ipath?: string; /** 集成路径，指向集成点的唯一标识符 {@link CPIntegrationManager} */
  briefPath?: string; /** 简要路径，指向节点在CP(eaog)中的位置，比一般tree path短，便于理解 {@link CPIntegrationManager} */
  private _integrationManager?: EditableIntegrationManager; // 集成管理器，处理集成点的添加和查询

  get integrationManager(): EditableIntegrationManager | undefined {
    return this.root?._integrationManager
  }

  set integrationManager(value: EditableIntegrationManager) {
    if (!this.isRoot) {
      throw new Error('只能在根节点上设置集成管理器');
    }
    this._integrationManager = value;
  }


  constructor(node: EaogNode, cp?: EditableCP, parent?: EditableEaogNode) {
    Object.assign(this, node); // 将传入的节点数据赋值给当前实例
    this.cp = cp; // 设置所属CP
    this.parent = parent; // 设置父节点
    this.ui = new EditableEaogNodeUI(this); // 初始化UI交互状态和行为
    this.children = Array.isArray(node.children)
      ? node.children.map((child: EaogNode) => new EditableEaogNode(child, this.cp, this)) // 递归转换子节点
      : [];
  }



  // 业务逻辑相关的getter方法
  get isLeaf(): boolean {
    return Eaog.isLeafType(this.type);
  }

  get isContainer(): boolean {
    return !this.isLeaf;
  }

  get isFramework(): boolean {
    return this.meta?.framework === true; // 判断是否为 Eaog Framework
  }

  /**
   * 获取当前节点及其所有子孙节点
   */
  get nodes(): EditableEaogNode[] {
    return [this, ...this.descendants];
  }

  get isRoot(): boolean {
    return !this.parent; // 如果没有父节点，则为根节点
  }

  get root(): EditableEaogNode {
    return this.isRoot ? this : this.parent!.root;
  }

  get pathNodes(): EditableEaogNode[] {
    return this.isRoot ? [this] : [...this.parent!.pathNodes, this]; // 获取从根节点到当前节点的路径节点数组
  }

  get path(): string {
    return this.pathNodes.map(node => node.name).join('/'); // 获取从根节点到当前节点的路径字符串
  }

  get ancestors(): EditableEaogNode[] {
    return this.pathNodes.slice(0, -1); // 获取当前节点的所有祖先节点（不包括当前节点）
  }

  get descendants(): EditableEaogNode[] {
    return this.children.reduce((acc: EditableEaogNode[], child: EditableEaogNode) => {
      return acc.concat(child, child.descendants);
    }, []);
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

  get isIntegratedNode() {
    return this.integrationManager?.isIntegratedNode(this) || false;
  }

  get originalNode(): any | undefined {
    return this.integrationManager?.getOriginalNode(this);
  }

  get integratedNode(): any {
    const integratedNodes = this.integrationManager?.getIntegratedNodes(this, ShowAtType.Replace) || [];
    if (integratedNodes.length > 1) {
      console.warn(`节点有多个集成点，使用第一个：${integratedNodes[0]!.name}`);
    }
    return integratedNodes[0]
  }

  get integratedChildren(): any[] {
    const beforeNodes = this.integrationManager?.getIntegratedNodes(this, ShowAtType.Before) || [];
    const afterNodes = this.integrationManager?.getIntegratedNodes(this, ShowAtType.After) || [];
    return [...beforeNodes, ...this.children, ...afterNodes];
  }

  /**
   * 深度克隆当前节点及其所有子节点
   * omit parent reference to avoid circular references
   */
  cloneDeep<T extends EditableEaogNode = EditableEaogNode>(): T {
    // 使用泛型和this类型确保返回类型与调用者类型一致
    const Constructor = this.constructor as new (data: EaogNode, cp: EditableCP) => T;
    const clone = new Constructor(omit(this.toJSON(), ['children']), this.cp!) as T; // 创建一个新的实例，传入当前节点的JSON表示和所属CP
    clone.children = this.children.map(child => child.cloneDeep()) as T["children"];
    clone.children.forEach((child: EditableEaogNode) => child.parent = clone);
    return clone;
  }

  toJSON(): object {
    const transientProps = ['id', 'parent', 'children', 'cp', 'ui', 'ipath', 'briefPath', '_isEditableEaogNode', '_integrationManager', 'hookManager', 'syncManager', 'integrationManager'];
    const children = this.children.map(child => child.toJSON()); // 递归转换子节点为 JSON
    const res = {...omit(this, transientProps), children}; // 返回一个 JSON 对象，忽略 parent 和 children 属性
    return getCleanObj(res) as any; // 确保返回的对象没有 undefined 属性
  }

  equals(other: EditableEaogNode): boolean {
    return JSON.stringify(this.toJSON()) === JSON.stringify(other.toJSON()); // 比较两个节点的 JSON 表示是否相等
  }

  /**
   * 转换为表单值（编辑前、编辑后）
   * 必须转换，否则Vben Form会读取不到值。因为，表单绑定的currentNode<EditableEaogNode>，不是plain Object（有prototype链），通不过了 isPlainObject 检查，
   * @see defu@6.1.4/node_modules/defu/dist/defu.cjs#L5 由 packages/@core/ui-kit/form-ui/src/form-api.ts#L302 导入和使用
   * @param formValues 表单值
   * @return 返回一个对象，包含当前节点的可编辑属性，如果没有修改则返回 undefined
   */
  getObjFromFormValues(formValues?: Partial<EaogNode>): object | undefined {
    if (!formValues) { // 编辑前，空表单，返回当前节点的可编辑属性
      return omit(this.toJSON(), ['children']); // children、id不可以被节点表单编辑，children通过上下文菜单操作。
    } else { // 编辑后，合并表单值
      formValues = getCleanObj(formValues, {null: true, emptyArray: false, emptyObject: false}); // 去掉表单中值为undefined、空数组、空对象的属性，保留null
      const isModified = Object.keys(formValues as Object).some(key => formValues![key as keyof typeof formValues] !== (this as any)[key]);
      return isModified ? {...this.toJSON(), ...formValues} : undefined // 合并当前节点的属性和表单值
    }
  }

  mergeFormValues(values: Partial<EaogNode>): void {
    Object.assign(this, values);
  }

  // 树操作方法
  addChild(child: EditableEaogNode, anchor?: EditableEaogNode, position: 'before' | 'after' = 'after'): void {
    treeUtils.addChild(this, child, anchor, position);
  }

  insert(newNode: EditableEaogNode | EaogNode, position: 'before' | 'after' | 'child' | 'parent'): EditableEaogNode {
    const nodeToInsert = newNode instanceof EditableEaogNode ? newNode : new EditableEaogNode(newNode, this.cp);
    return treeUtils.insert(this, nodeToInsert, position);
  }

  replaceWith(newNode: EditableEaogNode | EaogNode): EditableEaogNode | undefined {
    const nodeToReplace = newNode instanceof EditableEaogNode ? newNode : new EditableEaogNode(newNode, this.cp);
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

export const validateEaog = (eaog: EditableEaogNode): SafeParseReturnType<any, any> => {
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

export const zogErrorToString = (error: ZodError): string => {
  return error.errors.map((err: ZodIssue) => {
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

