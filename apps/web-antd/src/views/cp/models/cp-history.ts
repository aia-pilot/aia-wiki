import { EditableCP } from './editable-cp';
import Debug from 'debug';

const debug = Debug('aia:cp:cp-history');

/**
 * CP历史记录管理类
 * 为每个CP提供独立的历史记录管理
 */
export class CPHistory {
  // 历史记录，保存CP的状态，用于撤销和重做操作
  private historyData: EditableCP[] = [];
  // 当前历史记录索引
  private currentIndex: number = -1;

  /**
   * 创建一个新的历史记录管理器
   * @param cp CP对象
   */
  constructor(cp?: EditableCP) {
    if (cp) {
      this.historyData.length = 0;
      this.historyData.push(cp.cloneDeep());
      this.currentIndex = 0;
    } else {
      throw new Error("cp can't be undefined when creating CPHistory");
    }
  }

  /**
   * 添加当前状态到历史记录
   * @param cp 当前CP状态
   */
  addToHistory(cp: EditableCP): void {
    // 清除当前索引之后的历史记录
    this.historyData.splice(this.currentIndex + 1);

    // 检查是否与最后一个历史记录相同
    const last = this.historyData[this.historyData.length - 1];
    if (last && cp.eaog.equals(last.eaog)) {
      return;
    }

    this.historyData.push(cp.cloneDeep());
    this.currentIndex = this.historyData.length - 1; // 更新当前索引
  }

  /**
   * 撤销操作
   * @returns 撤销后的CP状态，如果无法撤销则返回undefined
   */
  undo(): EditableCP | undefined {
    if (this.currentIndex <= 0) return undefined;
    this.currentIndex--;
    return this.historyData[this.currentIndex]?.cloneDeep();
  }

  /**
   * 重做操作
   * @returns 重做后的CP状态，如果无法重做则返回undefined
   */
  redo(): EditableCP | undefined {
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
  getLast(): EditableCP | undefined {
    return this.historyData[this.historyData.length - 1];
  }
}

