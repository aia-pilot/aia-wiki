import { EditableEaogNode } from './editable-eaog-node';
import Debug from 'debug';

const debug = Debug('aia:cp:eaog-history');

/**
 * EAOG历史记录管理类
 * 为每个EAOG根节点提供独立的历史记录管理
 */
export class EaogHistory {
  // 历史记录，保存EAOG的状态，用于撤销和重做操作
  private historyData: EditableEaogNode[] = [];
  // 当前历史记录索引
  private currentIndex: number = -1;

  /**
   * 创建一个新的历史记录管理器
   * @param rootNode EAOG根节点
   */
  constructor(rootNode?: EditableEaogNode) {
    if (rootNode) {
      this.initHistory(rootNode);
    }
  }

  /**
   * 初始化历史记录
   */
  initHistory(node: EditableEaogNode): void {
    this.historyData.length = 0;
    this.historyData.push(node.cloneDeep());
    this.currentIndex = 0;
  }

  /**
   * 添加当前状态到历史记录
   * @param eaog 当前EAOG状态
   */
  addToHistory(eaog: EditableEaogNode): void {
    // 清除当前索引之后的历史记录
    this.historyData.splice(this.currentIndex + 1);

    // 检查是否与最后一个历史记录相同
    if (this.historyData.length > 0 && eaog.equals(this.historyData[this.historyData.length - 1]!)) {
      return;
    }

    this.historyData.push(eaog.cloneDeep());
    this.currentIndex = this.historyData.length - 1; // 更新当前索引
  }

  /**
   * 撤销操作
   * @returns 撤销后的EAOG状态，如果无法撤销则返回undefined
   */
  undo(): EditableEaogNode | undefined {
    if (this.currentIndex <= 0) return undefined;
    this.currentIndex--;
    return this.historyData[this.currentIndex]?.cloneDeep();
  }

  /**
   * 重做操作
   * @returns 重做后的EAOG状态，如果无法重做则返回undefined
   */
  redo(): EditableEaogNode | undefined {
    if (this.currentIndex >= this.historyData.length - 1) return undefined;
    this.currentIndex++;
    return this.historyData[this.currentIndex]?.cloneDeep();
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.currentIndex < this.historyData.length - 1;
  }

  /**
   * 获取最后一个历史记录
   */
  getLast(): EditableEaogNode | undefined {
    return this.historyData[this.historyData.length - 1];
  }
}
