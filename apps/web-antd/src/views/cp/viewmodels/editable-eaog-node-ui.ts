import * as treeUtils from "../utils/tree-utils";
import {Eaog} from "../../../../../../../aia-eaog/src/eaog";
import type {IntegrationType} from "#/views/cp/models/types";
import {currentNode} from "./cp-editor-state";
import type {EditableECTNode} from "#/views/cp/models/ect/editable-ect";

/**
 * EditableEaogNodeUI - 负责节点的 UI 交互状态和行为
 * 从 EditableEaogNodeVM 提取出来，只包含 UI 交互相关的功能
 */
export class EditableEaogNodeUI {
  model: EditableECTNode; // 关联的 EditableECTNode 实例
  // UI交互状态
  isNewlyModified = false; // 标记是否为新添加的节点，用于动画效果
  isSelected = false; // 标记是否被选中
  isCollapsed = false; // 标记节点是否折叠子节点

  constructor(model: EditableECTNode) {
    this.model = model;
  }


  /** 是否被折叠起来了 */
  get isBeenCollapsed(): boolean {
    return this.model.pathNodes.some(node => node.ui.isCollapsed); // 从根到当前，只要有折叠，就是被折叠了
  }

  get childrenDirection(): 'vertical' | 'horizontal' | '' {
    return this.model.isLeaf ? ''  // 叶子节点没有子节点，返回空字符串
      : Eaog.isConcurrentType(this.model.type) || Eaog.isConditionalType(this.model.type) ? 'horizontal'  // 并行和条件节点的子节点水平排列
        : 'vertical'; // 其余节点的子节点垂直排列
  }


  // 展示集成CP的节点
  get showNode(): EditableECTNode {
    return this.model.integratedNode || this.model; // 如果有集成点，使用第一个，否则使用当前节点
  }

  get showChildren(): any[] {
    return this.model.integratedChildren
  }

  // TODO: 更名 integrationManager?.open 为 load？
  async openIntegration(integrationType: IntegrationType, index: number = 0) {
    await this.model.integrationManager?.open(this.model, integrationType, index);
  }

  async closeIntegration(integrationType: IntegrationType, index: number = 0) {
    await this.model.integrationManager?.close(this.model, integrationType, index);
  }

  async toggleIntegration(integrationType: IntegrationType, index: number = 0) {
    await this.model.integrationManager?.toggle(this.model, integrationType, index);
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
      treeUtils.traverseAll(this.model.root, node => {
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
      treeUtils.traverseAll(this.model.root, node => {
        node.ui.isSelected = false; // 清除所有节点的选中状态
      });
    }
  }

  // 获取所有被选中的节点
  getSelectedNodes(): EditableECTNode[] {
    const selected: any[] = [];
    treeUtils.traverseAll(this.model.root, node => {
      if (node.ui.isSelected) {
        selected.push(node);
      }
    });
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
}

