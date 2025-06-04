
//@ts-ignore
import {Eaog} from "../../../../../../../aia-eaog/src/eaog.js";


// 节点类型对应的颜色和图标
export const nodeTypeUIConfig = {
  sand: {color: 'blue', icon: '↓', description: '顺序节点：子节点按顺序执行'},
  pand: {color: 'green', icon: '⇉', description: '并行与节点：子节点并行执行，全部完成才继续'},
  pfor: {color: 'green', icon: '⇉', description: '并行循环：对列表元素并行执行'},
  cor: {color: 'orange', icon: '?', description: '条件节点：根据条件选择一个子节点执行'},
  instruction: {color: 'purple', icon: '◉', description: '指令节点：执行具体操作'},
  sitr: {color: 'cyan', icon: '↻', description: '顺序迭代：重复执行子节点'},
  recursion: {color: 'magenta', icon: '↺', description: '递归：调用其他节点'}
};
// 根据节点类型判断子节点的排列方向
export const getChildrenDirection = (nodeType: string): 'vertical' | 'horizontal' | '' => {
  return Eaog.isLeafType(nodeType) ? ''  // 叶子节点没有子节点，返回空字符串
    : Eaog.isConcurrentType(nodeType) || Eaog.isConditionalType(nodeType) ? 'horizontal'  // 并行和条件节点的子节点水平排列
      : 'vertical'; // 其余节点的子节点垂直排列
};

export const isLeafNode = (node: any): boolean => {
  return Eaog.isLeafType(node?.type);
}

export const isContainerNode = (node: any): boolean => {
  return !isLeafNode(node);
}

/**
 * EAOG示例用例集
 * 用于驱动CP可视化组件的开发
 */

/**
 * 定义 EAOG 节点类型接口
 * TODO：按照 eaog.zod.js 中的定义
 */

// eaog.types.ts
import { z } from 'zod';
// @ts-ignore
import {instructionSchema, nodeSchema, pandSchema, sandSchema} from "../../../../../../../aia-eaog/src/eaog.zod.js";

export type EaogNode = z.infer<typeof nodeSchema>;

export type SandNode = z.infer<typeof sandSchema>;
export type PandNode = z.infer<typeof pandSchema>;
export type InstructionNode = z.infer<typeof instructionSchema>;
// TODO：other node types as needed

//
// export interface EaogNode {
//   type: string;
//   name: string;
//   description?: string;
//   children?: EaogNode[];
//
//   [key: string]: any; // 允许其他属性
// }
