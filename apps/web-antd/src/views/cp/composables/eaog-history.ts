import {reactive, ref} from 'vue';
import {EditableEaogNode, convertToEaogRoot, currentEaog} from '../models/editable-eaog-node';

// 历史记录，保存EAOG的状态，用于撤销和重做操作
const historyData = reactive<EditableEaogNode[]>([]);
// 当前历史记录索引
const currentIndex = ref(-1);

/**
 * 历史记录管理的可组合函数
 * @returns 历史记录相关的状态和方法
 */
export function useHistory() {
  /**
   * 初始化历史记录
   */
  const initHistory = (node: EditableEaogNode) => {
    historyData.length = 0;
    historyData.push(node.cloneDeep());
    currentIndex.value = 0;
  };

  /**
   * 添加当前状态到历史记录，不再需要传递节点参数，直接使用共享的currentEaog
   */
  const addToHistory = () => {
    const eaog = currentEaog.value;
    if (!eaog) return;

    // 清除当前索引之后的历史记录
    historyData.splice(currentIndex.value + 1);

    // 检查是否与最后一个历史记录相同
    if (historyData.length > 0 && eaog.equals(historyData[historyData.length - 1])) {
      return;
    }

    historyData.push(eaog.cloneDeep());
    currentIndex.value = historyData.length - 1; // 更新当前索引
  };

  /**
   * 撤销操作
   */
  const undo = () => {
    if (currentIndex.value <= 0) return;
    currentIndex.value--;
    return historyData[currentIndex.value].cloneDeep();
  };

  /**
   * 重做操作
   */
  const redo = () => {
    if (currentIndex.value >= historyData.length - 1) return;
    currentIndex.value++;
    return historyData[currentIndex.value].cloneDeep();
  };

  /**
   * 检查是否可以撤销
   */
  const canUndo = () => currentIndex.value > 0;

  /**
   * 检查是否可以重做
   */
  const canRedo = () => currentIndex.value < historyData.length - 1;

  const getLast = () => historyData[historyData.length - 1];

  return {
    historyData,
    currentIndex,
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    getLast,
    initHistory
  };
}
