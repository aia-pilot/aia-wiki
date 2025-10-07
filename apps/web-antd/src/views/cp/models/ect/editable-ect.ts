// editable-ect-node.ts
import type { SafeParseReturnType, ZodError, ZodIssue } from "zod";
import { NodeSchema, type NodeType, Node, Composite, create } from "eaog/ect";
import { omit } from "lodash-es";
import { getCleanObj } from "../../utils/clean-obj";
import Debug from "debug";
import * as treeUtils from "../../utils/tree-utils";
import { EditableECTNodeVM } from "../../viewmodels/ect/editable-ect-node-vm";

// ---- 临时类型占位（与原文件一致） ----
type EditableIntegrationManager = any;
type EditableCP = any;

export enum ShowAtType {
  Before = "before",
  After = "after",
  Replace = "replace",
  Parallel = "parallel",
}

// @ts-expect-error typed scope name is fine
const debug = Debug("aia:cp:ect-node");

// ---- EditableECTNode 接口，声明所有扩展的属性/方法 ----
export type EditableECTNode = Composite & {
  ui: EditableECTNodeVM;
  cp?: EditableCP;
  id: string;
  _isEditableECTNode: boolean;
  ipath?: string;
  briefPath?: string;
  _integrationManager?: EditableIntegrationManager;

  readonly isFramework: boolean;
  readonly isIntegratedNode: boolean;
  readonly originalNode: any | undefined;
  readonly integratedNode: any;
  readonly integratedChildren: any[];

  // 便捷属性/导航
  readonly isLeaf: boolean;
  readonly isContainer: boolean;
  readonly pathNodes: EditableECTNode[];
  readonly path: string;
  readonly nodes: EditableECTNode[];
  readonly ancestors: EditableECTNode[];
  readonly descendants: EditableECTNode[];
  readonly previousSibling: EditableECTNode | undefined;
  readonly nextSibling: EditableECTNode | undefined;
  readonly indexInParent: number;

  integrationManager?: EditableIntegrationManager;

  // 方法
  cloneDeep<T extends EditableECTNode>(): T;
  toJSON(): object;
  equals(other: EditableECTNode): boolean;
  getObjFromFormValues(formValues?: Partial<NodeType>): object | undefined;
  mergeFormValues(values: Partial<NodeType>): void;

  // 树操作
  addChild(
    child: EditableECTNode,
    anchor?: EditableECTNode,
    position?: "before" | "after"
  ): void;
  insert(
    newNode: EditableECTNode | NodeType,
    position: "before" | "after" | "child" | "parent"
  ): EditableECTNode;
  replaceWith(newNode: EditableECTNode | NodeType): EditableECTNode | undefined;
  replaceWithPlaceHolder(): EditableECTNode;
  shrinkSequentialParent(): boolean;
  remove(deleteSubtree?: boolean): EditableECTNode;
  getDescendantByPath(path: string): EditableECTNode | null;
  getNodeByPath(path: string): EditableECTNode | null;
  moveTo(
    targetNode: EditableECTNode,
    position: "before" | "after" | "child"
  ): boolean;
};

// ---- 类型守卫 ----
export function isEditableECTNode(obj: unknown): obj is EditableECTNode {
  return !!obj && typeof obj === "object" && (obj as any)._isEditableECTNode === true;
}

// ---- 工具：生成稳定 UUID（兼容无 crypto.randomUUID 的环境）----
const genId = () => {
  try {
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  } catch {}
  // 退化
  return "ect_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
};

// ---- 将可编辑行为以“类型安全的 Mixin”注入到节点（断言函数）----
// 使用断言函数可在调用点直接收窄类型为 (T & EditableECTNode)
function makeEditable<T extends Node>(node: T, cp?: EditableCP): asserts node is T & EditableECTNode {
  // 固定/瞬时属性
  Object.defineProperties(node, {
    id: { value: genId(), writable: true, enumerable: false },
    _isEditableECTNode: { value: true, writable: true, enumerable: false },
    ui: { value: new EditableECTNodeVM(node as unknown as Node), writable: true, enumerable: false },
    cp: { value: cp, writable: true, enumerable: false },
    ipath: { value: undefined, writable: true, enumerable: false },
    briefPath: { value: undefined, writable: true, enumerable: false },
    _integrationManager: { value: undefined, writable: true, enumerable: false },
  });

  // 计算属性 & 方法（完全类型化）
  const descriptors: PropertyDescriptorMap = {
    isFramework: {
      get() {
        const self = this as EditableECTNode;
        return self.$?.framework === true;
      },
    },
    isLeaf: {
      get() {
        const self = this as EditableECTNode;
        return !self.children || self.children.length === 0;
      },
    },
    isContainer: {
      get() {
        const self = this as EditableECTNode;
        return !self.isLeaf;
      },
    },
    pathNodes: {
      get() {
        const self = this as EditableECTNode;
        return self.isRoot ? [self] : [...(self.parent as EditableECTNode).pathNodes, self];
      },
    },
    path: {
      get() {
        const self = this as EditableECTNode;
        return self.pathNodes.map((n) => n.name).join("/");
      },
    },
    nodes: {
      get() {
        const self = this as EditableECTNode;
        return [self, ...self.descendants];
      },
    },
    ancestors: {
      get() {
        const self = this as EditableECTNode;
        return self.pathNodes.slice(0, -1);
      },
    },
    descendants: {
      get() {
        const self = this as EditableECTNode;
        return (
          self.children?.reduce<EditableECTNode[]>((acc, c) => {
            const child = c as EditableECTNode;
            acc.push(child, ...child.descendants);
            return acc;
          }, []) ?? []
        );
      },
    },
    previousSibling: {
      get() {
        const self = this as EditableECTNode;
        if (!self.parent) return undefined;
        const i = self.indexInParent;
        return i > 0 ? (self.parent.children[i - 1] as EditableECTNode) : undefined;
      },
    },
    nextSibling: {
      get() {
        const self = this as EditableECTNode;
        if (!self.parent) return undefined;
        const i = self.indexInParent;
        return i < self.parent.children.length - 1
          ? (self.parent.children[i + 1] as EditableECTNode)
          : undefined;
      },
    },
    indexInParent: {
      get() {
        const self = this as EditableECTNode;
        return self.parent ? self.parent.children.indexOf(self) : -1;
      },
    },
    integrationManager: {
      get() {
        const self = this as EditableECTNode;
        return (self.root as EditableECTNode)._integrationManager;
      },
      set(value: EditableIntegrationManager) {
        const self = this as EditableECTNode;
        if (!self.isRoot) throw new Error("只能在根节点上设置集成管理器");
        (self as any)._integrationManager = value;
      },
    },
    isIntegratedNode: {
      get() {
        const self = this as EditableECTNode;
        return self.integrationManager?.isIntegratedNode(self) ?? false;
      },
    },
    originalNode: {
      get() {
        const self = this as EditableECTNode;
        return self.integrationManager?.getOriginalNode(self);
      },
    },
    integratedNode: {
      get() {
        const self = this as EditableECTNode;
        const list = self.integrationManager?.getIntegratedNodes(self, ShowAtType.Replace) ?? [];
        if (list.length > 1) {
          console.warn(`节点有多个集成点，使用第一个：${list[0]?.name}`);
        }
        return list[0];
      },
    },
    integratedChildren: {
      get() {
        const self = this as EditableECTNode;
        const beforeNodes = self.integrationManager?.getIntegratedNodes(self, ShowAtType.Before) ?? [];
        const afterNodes = self.integrationManager?.getIntegratedNodes(self, ShowAtType.After) ?? [];
        return [...beforeNodes, ...(self.children ?? []), ...afterNodes];
      },
    },

    // ---- 方法 ----
    cloneDeep: {
      value<T extends EditableECTNode = EditableECTNode>(): T {
        const self = this as EditableECTNode;
        const nodeData = omit(self.toJSON(), ["children"]);
        const clone = createEditableECTNode(nodeData as NodeType, self.cp) as T;
        clone.children = self.children?.map((c) => (c as EditableECTNode).cloneDeep()) as T["children"];
        clone.children?.forEach((ch) => ch.setParent(clone as unknown as Composite));
        return clone;
      },
    },

    toJSON: {
      value(): object {
        const self = this as EditableECTNode;
        const transient = new Set([
          "id",
          "parent",
          "children",
          "cp",
          "ui",
          "ipath",
          "briefPath",
          "_isEditableECTNode",
          "_integrationManager",
          "hookManager",
          "syncManager",
          "integrationManager",
        ]);

        const own = Object.getOwnPropertyNames(self).filter(
          (k) => !transient.has(k) && typeof Object.getOwnPropertyDescriptor(self, k)?.get !== "function"
        );

        const base = own.reduce<Record<string, any>>((acc, k) => {
          acc[k] = (self as any)[k];
          return acc;
        }, {});

        const children = self.children?.map((c) => (c as EditableECTNode).toJSON());
        return getCleanObj({ ...base, children }) as any;
      },
    },

    equals: {
      value(other: EditableECTNode): boolean {
        const self = this as EditableECTNode;
        return JSON.stringify(self.toJSON()) === JSON.stringify(other.toJSON());
      },
    },

    getObjFromFormValues: {
      value(formValues?: Partial<NodeType>): object | undefined {
        const self = this as EditableECTNode;
        if (!formValues) {
          return omit(self.toJSON(), ["children"]);
        }
        const clean = getCleanObj(formValues, { null: true, emptyArray: false, emptyObject: false });
        const modified = Object.keys(clean as object).some(
          (k) => (clean as any)[k] !== (self as any)[k]
        );
        return modified ? { ...self.toJSON(), ...clean } : undefined;
      },
    },

    mergeFormValues: {
      value(values: Partial<NodeType>): void {
        Object.assign(this as EditableECTNode, values);
      },
    },

    addChild: {
      value(child: EditableECTNode, anchor?: EditableECTNode, position: "before" | "after" = "after"): void {
        treeUtils.addChild(this as EditableECTNode, child, anchor, position);
      },
    },

    insert: {
      value(newNode: EditableECTNode | NodeType, position: "before" | "after" | "child" | "parent"): EditableECTNode {
        const self = this as EditableECTNode;
        const toInsert = isEditableECTNode(newNode) ? newNode : createEditableECTNode(newNode, self.cp);
        return treeUtils.insert(self, toInsert, position);
      },
    },

    replaceWith: {
      value(newNode: EditableECTNode | NodeType): EditableECTNode | undefined {
        const self = this as EditableECTNode;
        const nodeToReplace = isEditableECTNode(newNode) ? newNode : createEditableECTNode(newNode, self.cp);
        return treeUtils.replaceWith(self, nodeToReplace);
      },
    },

    replaceWithPlaceHolder: {
      value(): EditableECTNode {
        const self = this as EditableECTNode;
        const placeholder = createPlaceHolderNode(self.name);
        return (self.replaceWith(placeholder) as EditableECTNode)!;
      },
    },

    shrinkSequentialParent: {
      value(): boolean {
        return treeUtils.shrinkSequentialParent(this as EditableECTNode);
      },
    },

    remove: {
      value(deleteSubtree: boolean = true): EditableECTNode {
        return treeUtils.remove(this as EditableECTNode, deleteSubtree);
      },
    },

    getDescendantByPath: {
      value(path: string): EditableECTNode | null {
        return treeUtils.getDescendantByPath(this as EditableECTNode, path);
      },
    },

    getNodeByPath: {
      value(path: string): EditableECTNode | null {
        const self = this as EditableECTNode;
        return treeUtils.getNodeByPath(self.root as EditableECTNode, path);
      },
    },

    moveTo: {
      value(targetNode: EditableECTNode, position: "before" | "after" | "child"): boolean {
        return treeUtils.moveTo(this as EditableECTNode, targetNode, position);
      },
    },
  };

  Object.defineProperties(node, descriptors);
}

// ---- 递归整树可编辑（保持返回类型为 EditableECTNode）----
function makeTreeEditable(root: Node, cp?: EditableCP): EditableECTNode {
  makeEditable(root, cp); // 断言函数：root 现在是 Node & EditableECTNode
  const editableRoot = root as EditableECTNode;

  if (editableRoot.children?.length) {
    for (let i = 0; i < editableRoot.children.length; i++) {
      const child = editableRoot.children[i] as Node;
      const editableChild = makeTreeEditable(child, cp);
      editableRoot.children[i] = editableChild;
      editableChild.setParent(editableRoot as unknown as Composite);
    }
  }
  return editableRoot;
}

// ---- 工厂：单节点 ----
export function createEditableECTNode(nodeDef: NodeType, cp?: EditableCP): EditableECTNode {
  const node = create(nodeDef);
  makeEditable(node, cp);
  return node as EditableECTNode;
}

// ---- 工厂：整棵树 ----
export function createEditableECT(rootNode: NodeType, cp: EditableCP): EditableECTNode {
  const ect = create(rootNode);
  return makeTreeEditable(ect, cp);
}

// ---- 校验 ----
export const validateECT = (ect: EditableECTNode): SafeParseReturnType<any, any> => {
  return NodeSchema.safeParse(ect.toJSON());
};

// ---- Zod 错误格式化 ----
export const zodErrorToString = (error: ZodError): string =>
  error.errors.map((err: ZodIssue) => `${err.path.join(".")} - ${err.message}`).join("\n");

// ---- 占位节点 ----
export const createPlaceHolderNode = (name: string): EditableECTNode =>
  createEditableECTNode({
    type: "empty",
    name: `${name}-placeholder`,
    description: "This is a placeholder node",
  });
