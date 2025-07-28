import {ref} from 'vue';
import {currentCP} from "../viewmodels/cp-editor-state";
import {IntegratedCPManager} from "../viewmodels/integrated-cp";
import type {EaogNode} from "#/views/cp/models/types";
import {EditableEaogNode} from './editable-eaog-node';
import * as treeUtils from "../utils/tree-utils";
import type {EditableCP} from "#/views/cp/viewmodels/editable-cp";
import {EditableIntegrationManager} from "#/views/cp/models/editable-integration-manager";

// 用于存储 Model 到 ViewModel 的映射关系，避免重复创建 VM
const modelToVMMap = new WeakMap<EditableEaogNode, EditableEaogNodeVM>();

// ViewModel层的引用存储
export const clipboardNode = ref<EditableEaogNodeVMType | undefined>(); // 复制到剪贴板的节点
export const currentNode = ref<EditableEaogNodeVMType | undefined>(); // 当前点击的节点（不一定是选中状态）

// 定义会改变树结构的方法名列表，这些方法调用后需要同步VM和Model树
const STRUCTURE_CHANGE_METHODS = [
  'addChild', 'insert', 'replaceWith', 'remove', 'moveTo', 'replaceWithPlaceHolder'
];

/**
 * 为了让TypeScript能够正确推断透传的方法和属性，我们定义一个类型，包含EditableEaogNode的所有方法和属性
 * 注意：这只是类型声明，不会影响实际的运行时行为
 */
export type EditableEaogNodeVMType = EditableEaogNodeVM & EditableEaogNode;

/**
 * EditableEaogNode的ViewModel层
 * 负责UI交互属性和行为
 */
export class EditableEaogNodeVM {
  model: EditableEaogNode;

  // UI交互状态
  id: string = crypto.randomUUID(); // Vue框架缓存依据
  isNewlyModified = ref(false); // 标记是否为新添加的节点，用于动画效果
  isSelected = ref(false); // 标记是否被选中
  isCollapsed = ref(false); // 标记节点是否折叠子节点

  // 用于显示集成的属性 TODO：有点多，待改进
  integratedCPManager?: IntegratedCPManager; // 集成CP管理器，用于处理集成CP的逻辑
  integratedCPBeforeNode?: EditableEaogNodeVM; // 前置的集成CP节点，用于展示
  integratedCPAfterNode?: EditableEaogNodeVM; // 后置的集成CP节点，用于展示
  integratedCPReplaceNode?: EditableEaogNodeVM; // 替换（本节点）的集成CP节点，用于展示

  // 由Creator Wrie进来的属性
  cp?: EditableCP; // 当前Eaog的CP（TRANSIENT)
  integrationManager?: EditableIntegrationManager; // 集成管理器，处理集成点的添加和查询
  ipath?: string;
  /** 集成路径 {@link CPIntegrationManager}，如何从顶层CP集成到当前CP（TRANSIENT）*/



  declare parent?: EditableEaogNodeVM;
  declare children: EditableEaogNodeVM[];
  declare root?: EditableEaogNodeVM;

  // ...其他属性和方法

  /**
   * 注意：请使用 createEditableEaogNodeVM 工厂函数创建实例，否则不正确！
   */
  constructor(model: EditableEaogNode) {
    this.model = model;
  }

  // 展示相关的计算属性
  get showNode(): EditableEaogNodeVM {
    return this.integratedCPReplaceNode || this;
  }

  get isReplacedByIntegratedCP(): boolean {
    return !!this.integratedCPReplaceNode;
  }

  get showChildren(): EditableEaogNodeVM[] {
    return [this.integratedCPBeforeNode, ...this.children, this.integratedCPAfterNode]
      .filter(Boolean) as EditableEaogNodeVM[];
  }

  // 节点点击处理
  click(shouldSelect = true, multiSelect = false): void {
    currentNode.value = this as unknown as EditableEaogNodeVMType; // 更新当前节点引用
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
          node.isSelected.value = false;
        }
      });
    }
    this.isSelected.value = !this.isSelected.value; // 切换选中状态
  }

  // 取消选中节点
  deselect(): void {
    this.isSelected.value = false;
  }

  // 取消所有选中
  deselectAll(): void {
    if (this.root) {
      treeUtils.traverseAll(this.root, node => {
        node.isSelected.value = false;
      });
    }
  }

  // 获取所有被选中的节点
  getSelectedNodes(): EditableEaogNodeVM[] {
    const selected: EditableEaogNodeVM[] = [];
    treeUtils.traverseAll(this.root, node => {
      if (node.isSelected.value) {
        selected.push(node);
      }
    });
    return selected;
  }

  // 设置新修改状态（用于动画效果）
  markAsNewlyModifiedForAWhile(duration = 2000): void {
    this.isNewlyModified.value = true;
    // 到时（2秒）取消。2秒，与CSS动画时长一致。
    setTimeout(() => {
      this.isNewlyModified.value = false;
    }, duration);
  }

  // 切换折叠状态
  toggleCollapse(): void {
    this.isCollapsed.value = !this.isCollapsed.value;
  }

  /**
   * 同步VM与子树 - 此方法主要用于初始化和更新树结构
   */
  sync(): void {
    const modelChildren = this.model.children;
    this.children = modelChildren.map(modelChild => {
      let vm = modelToVMMap.get(modelChild);

      if (!vm) {
        vm = createEditableEaogNodeVM(modelChild, this);
        modelToVMMap.set(modelChild, vm);
      } else {
        vm.parent = this;
        vm.sync();
      }

      return vm;
    });
  }

  // 使用Proxy透传model的业务属性
  makeModelProxy() {
    return new Proxy(this, {
      get: (target, key, receiver) => {
        // 先处理VM自身的属性和方法
        if (key in target) {
          return Reflect.get(target, key, receiver);
        }

        // 获取model层的属性或方法
        const modelValue = target.model[key as keyof EditableEaogNode];

        // 如果是方法，进行 1）参数VM → Model转换；2）调用；3）返回值Model → VM 转换
        // 有必要，还要同步树结构
        if (typeof modelValue === 'function') {
          return function (...args: any[]) {
            const convertedArgs = args.map(arg => convertVMToModel(arg));
            const result = modelValue.apply(target.model, convertedArgs);

            // 如果是结构变更方法，执行同步 - 简化为直接同步整个树
            if (STRUCTURE_CHANGE_METHODS.includes(key as string)) {
              target.root?.sync();

              // 处理特殊情况：根节点替换
              if ((key === 'replaceWith' || key === 'insert') && !target.parent) {
                const cp = currentCP.value;
                if (cp && result instanceof EditableEaogNode) {
                  // 根节点被替换，需要更新CP的引用
                  const newVM = createEditableEaogNodeVM(result);
                  cp.eaog = newVM;
                }
              }
            }

            return convertModelToVM(result);
          };
        }

        // 所有其他属性都基于值类型进行统一处理
        return convertModelToVM(modelValue);
      },

      set: (target, key, value, receiver) => {
        // 先处理VM自身的属性
        if (key in target) {
          return Reflect.set(target, key, value, receiver);
        }

        // 转换要设置的值（VM → Model）
        const convertedValue = convertVMToModel(value);

        // 更新model层的属性
        (target.model as any)[key] = convertedValue;

        // 如果修改了结构属性，触发同步 - 简化为直接同步整个树
        if (key === 'children' || key === 'parent') {
          target.root?.sync();
        }
        return true;
      }
    });
  }


}

/**
 * 工具函数：将VM对象或数组转换为对应的Model对象或数组
 */
function convertVMToModel(value: any): any {
  // 如果是EditableEaogNodeVM，转换为Model
  if (value instanceof EditableEaogNodeVM) {
    return value.model;
  }

  // 如果是EditableEaogNodeVM数组，将每个元素转换为Model
  if (Array.isArray(value) && value.length > 0 && value[0] instanceof EditableEaogNodeVM) {
    return value.map(item => item.model);
  }

  // 其他类型直接返回
  return value;
}

/**
 * 工具函��：将Model对象或数组转换为对应的VM对象或数组
 */
function convertModelToVM(result: any): any {
  // 如果是EditableEaogNode，查找或创建对应的VM
  if (result instanceof EditableEaogNode) {
    return modelToVMMap.get(result) || createEditableEaogNodeVM(result);
  }

  // 如果是EditableEaogNode数组，将每个元素转换为VM
  if (Array.isArray(result) && result.length > 0 && result[0] instanceof EditableEaogNode) {
    return result.map(node => modelToVMMap.get(node) || createEditableEaogNodeVM(node));
  }

  // 其它类型直接返回
  return result;
}


/**
 * 创建 EditableEaogNode 的 ViewModel 实例, 如果已存在则复用
 * ViewModel同时是 EditableEaogNode 的代理，在自身属性方法之外，还透传 model 的属性和方法
 * @param model
 * @param parentVM
 * @param cp
 */
export function createEditableEaogNodeVM(model: EaogNode, parentVM?: EditableEaogNodeVM, cp?: EditableCP): EditableEaogNodeVMType {
  // 首先检查 WeakMap 中是否已经存在该 model 对应的 VM
  let vm = modelToVMMap.get(model);

  // 如果不存在或父节点不匹配（可能已被移动），则创建新的 VM
  if (!vm || (parentVM && vm.parent !== parentVM)) {
    model = model instanceof EditableEaogNode ? model : new EditableEaogNode(model); // 确保 model 是 EditableEaogNode 实例
    vm = new EditableEaogNodeVM(model);
    vm = vm.makeModelProxy(); // 使用 Proxy 透传 model 的属性和方法
    vm.cp = cp ?? currentNode.value?.cp; // 关联当前 CP TODO:
    vm.integratedCPManager = new IntegratedCPManager(vm as unknown as EditableEaogNodeVMType); // 初始化集成CP管理器
    vm.parent = parentVM
    // 初始化子树
    vm.sync();
    modelToVMMap.set(model, vm);
  } else if (parentVM && vm.parent !== parentVM) {
    // 如果父节点变化，更新父节点引用
    vm.parent = parentVM;
  }

  return vm as unknown as EditableEaogNodeVMType;
}


/** 节点类型对应的颜色和图标 {@link allNodeTypes} */
export const nodeTypeUIConfig = {
  // 非叶（结构）节点，执行时不扩展
  sand: {color: 'blue', icon: '↓', description: '顺序节点：子节点按顺序执行'}, // 改为 seq sequence？
  pand: {color: 'green', icon: '⇊', description: '并行与节点：子节点并行执行，全部完成才继续'}, // 改为 par parallel
  cor: {color: 'orange', icon: '?', description: '条件节点：根据条件选择一个子节点执行'}, //

  for: {color: 'blue', icon: '↴', description: '循环节点：对列表元素依次执行'},
  pfor: {color: 'green', icon: '⇓', description: '并行循环：对列表中的元素并行执行'},
  por: {color: 'orange', icon: '⤓', description: '并行或节点：子节点中任意一个完成即可继续'},
  sitr: {color: 'cyan', icon: '⟳', description: '顺序迭代：重���执行子节点'},
  pitr: {color: 'cyan', icon: '⤨', description: '并行迭代：对列表元素并行执行'},

  // 叶（结构）节点，开发时扩展（Framework）
  'mount-point': {color: 'magenta', icon: '↦⊐', description: '框架上的挂载点'},

  // 叶（结构）节点，执行时动态扩展
  recursion: {color: 'magenta', icon: '⟲', description: '递归：调用其他节点（自身祖先）'},
  ref: {color: 'magenta', icon: '↗︎', description: '引用节点：引用执行其他节点（子树，非自身祖先）'},

  // 叶（行为）节点，执行时不扩展
  empty: {color: 'gray', icon: '◎', description: '空节点：没有行为，仅用于占位，保持结构完整'},
  end: {color: 'gray', icon: '◉', description: '结束节点：流程结束'},
  instruction: {color: 'purple', icon: '▶', description: '指令节点：执行具体操作'}, // @deprecated
  action: {color: 'purple', icon: '▶', description: '指令节点：执行具体操作'},
  gen: {color: 'green', icon: '▷▷', description: '生成节点：将生成新的子树，替换当前节点'},

  // gen, hook, wait, ctx


  _default: {color: 'gray', icon: '◆', description: '未知节点��型'} // 未知节点，缺省配置
};
