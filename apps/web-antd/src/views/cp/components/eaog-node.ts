// 节点类型对应的颜色和图标
export const nodeTypeConfig = {
  sand: {color: 'blue', icon: '↓', description: '顺序节点：子节点按顺序执行'},
  pand: {color: 'green', icon: '⇉', description: '并行与节点：子节点并行执行，全部完成才继续'},
  pfor: {color: 'green', icon: '⇉', description: '并行循环：对列表元素并行执行'},
  cor: {color: 'orange', icon: '?', description: '条件节点：根据条件选择一个子节点执行'},
  instruction: {color: 'purple', icon: '◉', description: '指令节点：执行具体操作'},
  sitr: {color: 'cyan', icon: '↻', description: '顺序迭代：重复执行子节点'},
  recursion: {color: 'magenta', icon: '↺', description: '递归：调用其他节点'}
};
// 根据节点类型判断子节点的排列方向
export const getChildrenDirection = (nodeType: string): string => {
  // 顺序相关的节点，子节点垂直排列
  if (['sand', 'sitr'].includes(nodeType)) {
    return 'vertical';
  }
  // 并行、条件等节点，子节点水平排列
  return 'horizontal';
};

/**
 * EAOG示例用例集
 * 用于驱动CP可视化组件的开发
 */

// 定义 EAOG 节点类型接口
export interface EaogNode {
  type: string;
  name: string;
  description?: string;
  children?: EaogNode[];

  [key: string]: any; // 允许其他属性
}
