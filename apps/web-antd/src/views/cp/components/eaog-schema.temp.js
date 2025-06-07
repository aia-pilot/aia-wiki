import { z } from 'zod';

/**
 * EAOG节点类型的Zod Schema定义
 * 为EaogManager中的所有nodeTypes提供schema验证
 */

// 基础节点Schema
const baseNodeSchema = z.object({
  name: z.string().min(1).refine(
    name => !name.startsWith('@') && !name.startsWith('#') && !name.startsWith('$') && !name.includes('/'),
    { message: '节点名称不能以@、#、$开头，且不能包含/' }
  ),
  description: z.string().optional(),
  type: z.string(),
});

// 叶子节点Schema
const leafNodeSchema = baseNodeSchema;

// Empty节点Schema
const emptySchema = leafNodeSchema.extend({
  type: z.literal('empty')
});

// End节点Schema
const endSchema = leafNodeSchema.extend({
  type: z.literal('end')
});

/**
 * params 可以是:
 * 1. ParamDef 数组
 * 2. 对象，key 为参数名，value 为参数值
 */
const ParamsSchema = z.union([
  z.array(z.union([
    z.string(),
    z.object({
      paramName: z.string(),
      contextName: z.string().optional(),
      value: z.union([z.string(), z.function(), z.any()]).optional()
    }),
    z.record(z.string(), z.union([z.string(), z.function(), z.any()]))
  ])),
  z.record(z.string(), z.union([z.string(), z.function(), z.any()]))
]);

/**
 * results 可以是:
 * 1. ResultDef 数组
 * 2. 对象，key 为上下文变量名，value 为结果值定义
 */
const ResultsSchema = z.union([
  z.array(z.union([
    z.string(),
    z.object({
      paramName: z.string(),
      value: z.union([z.string(), z.function(), z.any()])
    })
  ])),
  z.record(z.string(), z.union([z.string(), z.function(), z.any()]))
]);

// Instruction节点Schema
const instructionSchema = z.object({
  name: z.string().min(3),
  value: z.record(z.string(), z.union([z.string(), z.function(), z.any()]))
});


// 组合节点Schema
const compositeNodeSchema = baseNodeSchema.extend({
  children: z.array(z.lazy(() => nodeSchema))
    .refine(
      children => {
        const names = children.map(child => child.name);
        return new Set(names).size === names.length;
      },
      { message: '组合节点中的子节点名称必须唯一' }
    ),
});

// Sand (Sequential AND) 节点Schema
const sandSchema = compositeNodeSchema.extend({
  type: z.literal('sand'),
});

// Pand (Parallel AND) 节点Schema
const pandSchema = compositeNodeSchema.extend({
  type: z.literal('pand'),
});

// Cor (Conditional OR) 节点Schema
const corSchema = compositeNodeSchema.extend({
  type: z.literal('cor'),
  condition: z.function(),
});

// Exp (Exploration) 节点Schema
const expSchema = compositeNodeSchema.extend({
  type: z.literal('exp'),
});

// 递归节点Schema
const recursionSchema = baseNodeSchema.extend({
  type: z.literal('recursion'),
  ref: z.string(),
});

// 迭代器基础Schema
const iteratorBaseSchema = compositeNodeSchema.extend({
  item: z.union([z.string(), z.object({ contextName: z.string() })]),
  items: z.union([z.string(), z.object({ contextName: z.string() })]),
});

// 顺序迭代器Schema
const sequentialIteratorSchema = iteratorBaseSchema.extend({
  type: z.literal('sitr'),
});

// 并发迭代器Schema
const concurrentIteratorSchema = iteratorBaseSchema.extend({
  type: z.literal('pitr'),
});

// For循环Schema
const forSchema = iteratorBaseSchema.extend({
  type: z.literal('for'),
});

// 并发For循环Schema
const pforSchema = iteratorBaseSchema.extend({
  type: z.literal('pfor'),
});

// 组合所有节点类型的Schema
const nodeSchema = z.discriminatedUnion('type', [
  sandSchema,
  pandSchema,
  corSchema,
  expSchema,
  endSchema,
  recursionSchema,
  sequentialIteratorSchema,
  concurrentIteratorSchema,
  forSchema,
  pforSchema,
  emptySchema,
  instructionSchema,
]);



export const allNodeTypes = [
  'instruction',
  'sand',
  'pand',
  'cor',
  'exp',
  'recursion',
  'sitr',
  'pitr',
  'for',
  'pfor',
  'empty',
  'end',
];

// 验证完整EAOG定义的Schema
const eaogSchema = nodeSchema;

export {
  eaogSchema,
  nodeSchema,
  baseNodeSchema,
  leafNodeSchema,
  emptySchema,
  endSchema,
  instructionSchema,
  compositeNodeSchema,
  sandSchema,
  pandSchema,
  corSchema,
  expSchema,
  recursionSchema,
  iteratorBaseSchema,
  sequentialIteratorSchema,
  concurrentIteratorSchema,
  forSchema,
  pforSchema,
};
