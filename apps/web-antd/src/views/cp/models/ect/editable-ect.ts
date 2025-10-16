// editable-ect-node.ts
import type {SafeParseReturnType, ZodError, ZodIssue} from "zod";
import {Composite, create, isPackagePath, Node, NodeSchema, type NodeType} from "eaog/ect";
import {omit} from "lodash-es";
import {getCleanObj} from "../../utils/clean-obj";
import Debug from "debug";
import * as treeUtils from "../../utils/tree-utils";
import {EditableECTNodeVM} from "../../viewmodels/ect/editable-ect-node-vm";
import type {EditableCP} from "aia-cpm/cpm";
import type {IntegrationPoint} from "aia-cpm/cpi";
import type {IPath} from "eaog/ect";



// @ts-expect-error typed scope name is fine
const debug = Debug("aia:cp:ect-node");

type NodeMeta = {                     // 元信息
  launchIPs?: IntegrationPoint[],  /** 在 IntegrationPoint#reverseBind 中绑定 */
  syncIPs?: IntegrationPoint[],
  [key: string]: any
}

// ---- EditableECTNode 接口，声明所有扩展的属性/方法 ----
export type EditableECTNode = Composite & {
  id: string;               // 唯一标识符，创建时生成
  ui: EditableECTNodeVM;    // ui(vm)对象，管理节点的UI交互状态和行为，ui.model指向此节点
  ipath?: IPath;           // 集成路径，在集成后CP完整ECT树上唯一
  briefPath?: IPath;       // 简短路径，在单一ECT树上唯一
  $: NodeMeta;

  // 类型守卫。为了简洁复用ECT Node原有的类型体系，我们采用了mixin方式注入属性和方法，以避免叠床架屋扩展每个ECT类型。
  // 此时，反射时，无法用instanceof判断，要用此属性
  _isEditableECTNode: boolean;

  readonly cp: EditableCP; // 所属CP
  readonly isFramework: boolean; // TODO：移除？
  readonly readonly: boolean;

  // 集成相关属性
  readonly hasIntegration: boolean;
  readonly beforeECTs: EditableECT[]; // 集成点前置节点，hook & block & phase before
  readonly afterECTs: EditableECT[];  // 集成点后置节点，hook & block & phase after
  readonly currentECTs: EditableECT[]; // 集成点替换节点，action & use
  readonly parallelECTs: EditableECT[]; // 集成点并行节点，(hook | side) & !block
  // readonly originalNode: any | undefined;
  // readonly integratedNode: any;
  // readonly integratedChildren: any[];

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
  readonly childIndex: number;


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

export type EditableECT = EditableECTNode & {
  $: NodeMeta & {
    cp: EditableCP;
  }
}

// ---- 类型守卫 ----
export function isEditableECTNode(obj: unknown): obj is EditableECTNode {
  return !!obj && typeof obj === "object" && (obj as any)._isEditableECTNode === true;
}

// ---- 工具：生成稳定 UUID（兼容无 crypto.randomUUID 的环境）----
const genId = () => {
  try {
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  } catch {
  }
  // 退化
  return "ect_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
};

// ---- 将可编辑行为以“类型安全的 Mixin”注入到节点（断言函数）----
function filterIntegrationsECTs(node: EditableECTNode, filter: (ip: IntegrationPoint) => boolean): EditableECT[] {
  return (node.$.launchIPs ?? []).filter(filter).map((ip: IntegrationPoint) => ip.integratedECT) as EditableECT[];
}

// 使用断言函数可在调用点直接收窄类型为 (T & EditableECTNode)
function makeEditable<T extends Node>(node: T): asserts node is T & EditableECTNode {
  // 固定/瞬时属性
  Object.defineProperties(node, {
    _isEditableECTNode: {value: true, writable: false, enumerable: false},
    id: {value: genId(), writable: false, enumerable: false},
    // ui: {value: new EditableECTNodeVM(node as EditableECTNode), writable: true, enumerable: false},
    ipath: {value: undefined, writable: true, enumerable: false},
    briefPath: {value: undefined, writable: true, enumerable: false},
  });

  // 计算属性 & 方法（完全类型化）
  const descriptors: PropertyDescriptorMap = {
    cp: {
      get() {
        const self = this as EditableECTNode;
        return self.$.root.cp as EditableCP;
      },
    },
    readonly: {
      get() {
        const self = this as EditableECTNode;
        return isPackagePath(self.root.$.cp.finalCpLocateStr); // 必须是本地文件系统中的cp，才能编辑, npm包中的cp不可编辑
      },
    },
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
    // nodes: {
    //   get() {
    //     const self = this as EditableECTNode;
    //     return [self, ...self.descendants];
    //   },
    // },
    ancestors: {
      get() {
        const self = this as EditableECTNode;
        return self.pathNodes.slice(0, -1);
      },
    },
    // descendants: {
    //   get() {
    //     const self = this as EditableECTNode;
    //     return (
    //       self.children?.reduce<EditableECTNode[]>((acc, c) => {
    //         const child = c as EditableECTNode;
    //         acc.push(child, ...child.descendants);
    //         return acc;
    //       }, []) ?? []
    //     );
    //   },
    // },
    previousSibling: {
      get() {
        const self = this as EditableECTNode;
        if (!self.parent) return undefined;
        const i = self.childIndex;
        return i > 0 ? (self.parent.children[i - 1] as EditableECTNode) : undefined;
      },
    },
    nextSibling: {
      get() {
        const self = this as EditableECTNode;
        if (!self.parent) return undefined;
        const i = self.childIndex;
        return i < self.parent.children.length - 1
          ? (self.parent.children[i + 1] as EditableECTNode)
          : undefined;
      },
    },
    // childIndex: {
    //   get() {
    //     const self = this as EditableECTNode;
    //     return self.parent ? self.parent.children.indexOf(self) : -1;
    //   },
    // },
    // integrationManager: {
    //   get() {
    //     const self = this as EditableECTNode;
    //     return (self.root as EditableECTNode)._integrationManager;
    //   },
    //   set(value: EditableIntegrationManager) {
    //     const self = this as EditableECTNode;
    //     if (!self.isRoot) throw new Error("只能在根节点上设置集成管理器");
    //     (self as any)._integrationManager = value;
    //   },
    // },
    hasIntegration: {
      get() {
        const self = this as EditableECTNode;
        return self.$.launchIPs ?? false;
      },
    },
    hasMultipleIntegrations: {
      get() {
        const self = this as EditableECTNode;
        return (self.$.launchIPs?.length ?? 0) > 1;
      },
    },
    // originalNode: {
    //   get() {
    //     const self = this as EditableECTNode;
    //     return self.integrationManager?.getOriginalNode(self);
    //   },
    // },
    // integratedNode: {
    //   get() {
    //     const self = this as EditableECTNode;
    //     const list = (self.$.launchIPs || [])
    //       .filter(ip => ip.block) // block才替换
    //       .map(ip => ip.integratedECT)
    //     // const list = self.integrationManager?.getIntegratedNodes(self, ShowAtType.Replace) ?? [];
    //     if (list.length > 1) { // ip.kind为action/use的集成点，TODO：use多个的情况
    //       console.warn(`节点有多个集成点，使用第一个：${list[0]?.name}`);
    //     }
    //     return list[0];
    //   },
    // },
    // integratedChildren: {
    //   get() {
    //     const self = this as EditableECTNode;
    //     const beforeNodes = self.integrationManager?.getIntegratedNodes(self, ShowAtType.Before) ?? [];
    //     const afterNodes = self.integrationManager?.getIntegratedNodes(self, ShowAtType.After) ?? [];
    //     return [...beforeNodes, ...(self.children ?? []), ...afterNodes];
    //   },
    // },

    // --- 集成相关节点 ----
    beforeECTs: {
      get() {
        return filterIntegrationsECTs(this as EditableECTNode, ip => ip.kind === "hook" && ip.block && ip.phase === "before");
      },
    },
    afterECTs: {
      get() {
        return filterIntegrationsECTs(this as EditableECTNode, ip => ip.kind === "hook" && ip.block && ip.phase === "after");
      },
    },
    currentECTs: {
      get() {
        return filterIntegrationsECTs(this as EditableECTNode, ip => ip.kind === "action" || ip.kind === "use");
      },
    },
    parallelECTs: {
      get() {
        return filterIntegrationsECTs(this as EditableECTNode, ip => (ip.kind === "hook" || ip.kind === "side") && !ip.block);
      },
    },

    // ---- 方法 ----
    cloneDeep: {
      value<T extends EditableECTNode = EditableECTNode>(): T {
        const self = this as EditableECTNode;
        const nodeData = omit(self.toJSON(), ["children"]);
        const clone = createEditableECTNode(nodeData as NodeType) as T;
        clone.$ = {...self.$}; // 浅拷贝元信息
        clone.children = self.children?.map((c) => (c as EditableECTNode).cloneDeep()) as T["children"];
        clone.children?.forEach((ch) => ch.setParent(clone as unknown as Composite));
        return clone;
      },
    },

    toJSON: {
      value(): object {
        const self = this as EditableECTNode;
        const transient = new Set([
          "$",
          "id",
          "parent",
          "children",
          "ui",
          "ipath",
          "briefPath",
          "_isEditableECTNode",
        ]);

        const own = Object.getOwnPropertyNames(self).filter(
          (k) => !transient.has(k) && typeof Object.getOwnPropertyDescriptor(self, k)?.get !== "function"
        );

        const base = own.reduce<Record<string, any>>((acc, k) => {
          acc[k] = (self as any)[k];
          return acc;
        }, {});

        const children = self.children?.map((c) => (c as EditableECTNode).toJSON());
        return getCleanObj({...base, children}) as any;
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
        const clean = getCleanObj(formValues, {null: true, emptyArray: false, emptyObject: false});
        const modified = Object.keys(clean as object).some(
          (k) => (clean as any)[k] !== (self as any)[k]
        );
        return modified ? {...self.toJSON(), ...clean} : undefined;
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
        const toInsert = isEditableECTNode(newNode) ? newNode : createEditableECTNode(newNode);
        return treeUtils.insert(self, toInsert, position);
      },
    },

    replaceWith: {
      value(newNode: EditableECTNode | NodeType): EditableECTNode | undefined {
        const self = this as EditableECTNode;
        const nodeToReplace = isEditableECTNode(newNode) ? newNode : createEditableECTNode(newNode);
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

/**
 * 递归转换整树所有节点，使其可编辑（转换为类型 EditableECTNode）
 */
export function makeTreeEditable(root: Node): EditableECTNode {
  makeEditable(root); // 断言函数：root 现在是 Node & EditableECTNode
  // ui: {value: new EditableECTNodeVM(node as EditableECTNode), writable: true, enumerable: false},
  const editableRoot = root as EditableECTNode;
  editableRoot.ui = new EditableECTNodeVM(editableRoot); // 双向关联

  if (editableRoot.children?.length) {
    for (let i = 0; i < editableRoot.children.length; i++) {
      const child = editableRoot.children[i] as Node;
      const editableChild = makeTreeEditable(child);
      editableRoot.children[i] = editableChild;
      editableChild.setParent(editableRoot as unknown as Composite);
    }
  }
  return editableRoot;
}

// ---- 工厂：单节点 ----
export function createEditableECTNode(nodeDef: NodeType): EditableECTNode {
  const node = create(nodeDef);
  makeEditable(node);
  return node as EditableECTNode;
}

// ---- 工厂：整棵树 ----
export function createEditableECT(rootNode: NodeType | Node): EditableECTNode {
  const ect = create(rootNode);
  return makeTreeEditable(ect);
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
