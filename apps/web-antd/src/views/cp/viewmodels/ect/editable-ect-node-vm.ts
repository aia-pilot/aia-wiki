// filepath: /Users/wangqing/IdeaProjects/abc-study-copilot/packages/aia-wiki-new/apps/web-antd/src/views/cp/viewmodels/ect/editable-ect-node-vm.ts
import * as treeUtils from "../../utils/tree-utils";
import {currentNode} from "../cp-editor-state";
import {createEditableECT, type EditableECTNode} from "#/views/cp/models/ect/editable-ect";

/**
 * EditableECTNodeVM - 负责ECT节点的 UI 交互状态和行为
 * 类似于 EditableEaogNodeUI，但为ECT节点设计
 */
export class EditableECTNodeVM {
  model: EditableECTNode; // 关联的 EditableECTNode 实例
  // UI交互状态
  isNewlyModified = false; // 标记是否为新添加的节点，用于动画效果
  isSelected = false; // 标记是否被选中
  isCollapsed = false; // 标记节点是否折叠子节点
  isShowIntegratedECTs = true ; // 是否显示集成的ECT节点，默认显示，给外部操作用
  isIntegratedECTsRoot = false; // 是否为集成的ECT节点根节点

  get _isShowIntegratedECTs(): boolean { // 内部使用，还要考虑blockECTs是否为空
    return this.isShowIntegratedECTs && this.blockECTs.length > 0;
  }

  constructor(model: EditableECTNode) {
    this.model = model;
  }


  private get blockECTs() {
    if (!this.model.cp.isIntegrated) {
      throw new Error("节点所属的CP未集成，无法获取阻塞集成ECT节点");
    }
    return [...this.model.beforeECTs, ...this.model.currentECTs, ...this.model.afterECTs];
  }

  // 集成的ECT节点树根节点（如果节点有多个阻塞集成点，将在主窗口显示为此节点的孩子）
  private _integratedECTsRootCache?: EditableECTNode;
  get integratedECTsRoot(): EditableECTNode | undefined {
    if (!this.model.cp.isIntegrated) {
      throw new Error("节点所属的CP未集成，无法获取集成的ECT节点");
    }

    if (this._integratedECTsRootCache === undefined) {
      const blockECTs = this.model.blockECTs;
      this._integratedECTsRootCache = blockECTs.length === 0 ? undefined : blockECTs.length === 1 ? blockECTs[0]! :
        createEditableECT({
          type: 'series',
          name: `[Integrated ECTs Root]: ${this.model.name}`,
          children: [...this.model.beforeECTs, ...this.model.currentECTs, ...this.model.afterECTs],
        });
      this._integratedECTsRootCache && (this._integratedECTsRootCache.ui.isIntegratedECTsRoot = true);
    }

    if (this._integratedECTsRootCache == null) {
      throw new Error("集成的ECT节点根节点未定义");
    }

    return this._integratedECTsRootCache;
  }

  get name(): string {
    return this.model.name + (this._isShowIntegratedECTs ? ' → ' + this.integratedECTsRoot!.name : '');
  }

  get description(): string {
    return this.model.description + (this._isShowIntegratedECTs ? ' → \n' + this.integratedECTsRoot!.description : '');
  }


  /** 是否被折叠起来了 */
  get isBeenCollapsed(): boolean {
    // 从根到当前，只要有折叠，就是被折叠了
    return this.model.pathNodes.some((node: EditableECTNode) => node.ui.isCollapsed);
  }

  get childrenDirection(): 'vertical' | 'horizontal' | '' {
    // 根据节点类型判断子节点排列方向
    if (!this.model.children || !Array.isArray(this.model.children) || this.model.children.length === 0) {
      return ''; // 没有子节点
    }

    // 根据节点类型判断方向
    const type = (this.model.type || "").toLowerCase();
    if (["parallel", "pand", "peach", "pitr", "cor", "mor", "por"].includes(type)) {
      return 'horizontal'; // 并行和条件节点的子节点水平排列
    }
    return 'vertical'; // 其余节点的子节点垂直排列
  }

  // 展示集成CP的节点
  get showNode(): EditableECTNode {
    return this._isShowIntegratedECTs ? this.integratedECTsRoot! : this.model;
  }

  // 节点点击处理
  click(shouldSelect = true, multiSelect = false): void {
    currentNode.value = this.model; // 更新当前节点引用
    if (shouldSelect) {
      this.select(multiSelect);
    }
  }

  // 选中节点
  select(multiSelect = false): void {
    if (!multiSelect && this.model.root) {
      // 如果不是多选模式，清除所有其它节点的选中状态
      treeUtils.traverseAll(this.model.root, (node: EditableECTNode) => {
        if (node.ui !== this) {
          node.ui.isSelected = false;
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
    if (this.model.root) {
      treeUtils.traverseAll(this.model.root, (node: EditableECTNode) => {
        node.ui.isSelected = false; // 清除所有节点的选中状态
      });
    }
  }

  // 获取所有被选中的节点
  getSelectedNodes(): EditableECTNode[] {
    const selected: any[] = [];
    if (this.model.root) {
      treeUtils.traverseAll(this.model.root, (node: EditableECTNode) => {
        if (node.ui.isSelected) {
          selected.push(node);
        }
      });
    }
    return selected;
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

  toggleBlockECTs(): void {
    this.isShowIntegratedECTs = !this.isShowIntegratedECTs;
  }
}

/** 节点类型对应的颜色和图标 */
export const nodeTypeUIConfig = {
  // 非叶（结构）节点
  sand: {color: 'blue', icon: '↓', description: '顺序节点：子节点按顺序执行'}, // 改为 seq sequence？
  pand: {color: 'green', icon: '⇊', description: '并行与节点：子节点并行执行，全部完成才继续'}, // 改为 par parallel
  cor: {color: 'orange', icon: '?', description: '条件节点：根据条件选择一个子节点执行'}, //

  for: {color: 'blue', icon: '↴', description: '循环节点：对列表元素依次执行'},
  pfor: {color: 'green', icon: '⇓', description: '并行循环：对列表中的元素并行执行'},
  por: {color: 'orange', icon: '⤓', description: '并行或节点：子节点中任意一个完成即可继续'},
  sitr: {color: 'cyan', icon: '⟳', description: '顺序迭代：重复执行子节点'},
  pitr: {color: 'cyan', icon: '⤨', description: '并行迭代：对列表元素并行执行'},
  'mount-point': {color: 'magenta', icon: '↦⊐', description: '框架上的挂载点'},
  "recursion-root": {color: 'magenta', icon: '⟲', description: '递归：调用其他节点（自身祖先）'},

  // 叶（结构）节点
  recursion: {color: 'magenta', icon: '↗︎', description: '引用节点：引用执行其他节点（子树，非自身祖先）'},
  empty: {color: 'gray', icon: '◎', description: '空节点：没有行为，仅用于占位，保持结构完整'},
  end: {color: 'gray', icon: '◉', description: '结束节点：流程结束'},

  // 叶（行为）节点
  action: {color: 'purple', icon: '▶', description: '指令节点：执行具体操作'},
  gen: {color: 'green', icon: '▷▷', description: '生成节点：将生成新的子树，替换当前节点'},

  // gen, hook, wait, ctx
  _default: {color: 'gray', icon: '◆', description: '未知节点��型'} // 未知节点，缺省配置
};
