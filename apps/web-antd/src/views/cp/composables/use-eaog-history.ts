import {type EditableEaogNode} from '../models/editable-eaog-node';
import {currentEaog} from '../models/cp-editor-state'; // 引入当前EAOG状态
import Debug from 'debug';

const debug = Debug('aia:cp:eaog-history');

/**
 * 历史记录管理的可组合函数
 * @param eaog 可选的EAOG节点，如果不提供则使用当前活动的EAOG
 * @returns 历史记录相关的状态和方法
 */
export function useHistory(eaog?: EditableEaogNode) {
  // 获取当前使用的EAOG，如果没有传递参数则使用全局当前EAOG
  const getEaog = () => eaog || currentEaog.value;

  /**
   * 初始化历史记录
   */
  const initHistory = (node: EditableEaogNode) => {
    node.initHistory();
    debug('初始化EAOG历史记录', node.name);
  };

  /**
   * 添加当前状态到历史记录
   */
  const addToHistory = () => {
    const activeEaog = getEaog();
    if (!activeEaog) {
      debug('没有活动的EAOG，无法添加到历史记录');
      return;
    }

    activeEaog.addToHistory();
    debug('添加EAOG状态到历史记录', activeEaog.name);
  };

  /**
   * 撤销操作
   */
  const undo = () => {
    const activeEaog = getEaog();
    if (!activeEaog) return;

    const history = activeEaog.getHistory();
    if (!history) {
      debug('EAOG没有历史记录，无法撤销操作', activeEaog.name);
      return;
    }

    return history.undo();
  };

  /**
   * 重做操作
   */
  const redo = () => {
    const activeEaog = getEaog();
    if (!activeEaog) return;

    const history = activeEaog.getHistory();
    if (!history) {
      debug('EAOG没有历史记录，无法重做操作', activeEaog.name);
      return;
    }

    return history.redo();
  };

  /**
   * 检查是否可以撤销
   */
  const canUndo = () => {
    const activeEaog = getEaog();
    if (!activeEaog) return false;

    const history = activeEaog.getHistory();
    return history ? history.canUndo() : false;
  };

  /**
   * 检查是否可以重做
   */
  const canRedo = () => {
    const activeEaog = getEaog();
    if (!activeEaog) return false;

    const history = activeEaog.getHistory();
    return history ? history.canRedo() : false;
  };

  /**
   * 获取最后一个历史记录
   */
  const getLast = () => {
    const activeEaog = getEaog();
    if (!activeEaog) return;

    const history = activeEaog.getHistory();
    return history ? history.getLast() : undefined;
  };

  return {
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    getLast,
    initHistory
  };
}
