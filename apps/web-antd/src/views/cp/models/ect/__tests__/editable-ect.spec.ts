// filepath: /Users/wangqing/IdeaProjects/abc-study-copilot/packages/aia-wiki-new/apps/web-antd/src/views/cp/models/ect/__tests__/editable-ect.spec.ts
import { describe, it, expect } from 'vitest';
import { createEditableECT, type EditableECTNode } from '../editable-ect';
import type { NodeType } from 'eaog/ect';

// 模拟EditableCP
const mockEditableCP = {
  eaog: {},
  hooks: [],
  sideCPs: []
};

describe('EditableECTNode', () => {
  describe('createEditableECT', () => {
    it('应该创建一个EditableECTNode根节点', () => {
      // 创建一个简单的节点定义
      const rootDef: NodeType = {
        type: 'series',
        name: 'root'
      };

      // 使用createEditableECT创建一个ECT
      const ect = createEditableECT(rootDef, mockEditableCP as any);

      // 验证根节点是否是EditableECTNode类型
      expect(ect).toBeDefined();
      expect(ect._isEditableECTNode).toBe(true);
      expect(ect.cp).toBe(mockEditableCP);
      expect(ect.ui).toBeDefined();
      expect(ect.id).toBeDefined(); // 应该有一个自动生成的ID
      expect(ect.type).toBe('series');
      expect(ect.name).toBe('root');
    });

    it('应该为ECT树中的所有节点添加EditableECTNode功能', () => {
      // 创建一个复杂的节点树定义
      const complexDef: NodeType = {
        type: 'series',
        name: 'root',
        children: [
          {
            type: 'action',
            name: 'action1'
          },
          {
            type: 'parallel',
            name: 'parallel1',
            children: [
              {
                type: 'action',
                name: 'action2'
              },
              {
                type: 'action',
                name: 'action3'
              }
            ]
          },
          {
            type: 'cor',
            name: 'condition1',
            condition: (_: any) => 'option1',
            children: [
              {
                type: 'action',
                name: 'option1',
                choice: 'option1'
              },
              {
                type: 'action',
                name: 'option2',
                choice: 'option2'
              }
            ]
          }
        ]
      };

      // 使用createEditableECT创建一个ECT
      const ect = createEditableECT(complexDef, mockEditableCP as any);

      // 递归检查所有节点是否都是EditableECTNode类型
      function checkAllNodesAreEditableECT(node: EditableECTNode): void {
        // 验证当前节点是EditableECTNode
        expect(node._isEditableECTNode).toBe(true);
        expect(node.ui).toBeDefined();
        expect(node.id).toBeDefined();
        expect(node.cp).toBe(mockEditableCP);

        // 如果有子节点，递归检查所有子节点
        if (node.children && node.children.length > 0) {
          node.children.forEach(child => {
            // 验证parent引用
            expect(child.parent).toBe(node);
            checkAllNodesAreEditableECT(child);
          });
        }
      }

      // 开始检查整棵树
      checkAllNodesAreEditableECT(ect);
    });

    it('应该允许通过ECT树中的每个节点访问其根节点', () => {
      // 创建一个多层级节点树
      const treeDef: NodeType = {
        type: 'series',
        name: 'root',
        children: [
          {
            type: 'series',
            name: 'level1',
            children: [
              {
                type: 'series',
                name: 'level2',
                children: [
                  {
                    type: 'action',
                    name: 'leaf'
                  }
                ]
              }
            ]
          }
        ]
      };

      // 创建ECT
      const ect = createEditableECT(treeDef, mockEditableCP as any);

      // 访问深层叶子节点
      const level1 = ect.children[0];
      const level2 = level1!.children[0];
      const leaf = level2!.children[0];

      // 验证每个节点都能访问到根节点
      expect(ect.root).toBe(ect);
      expect(level1!.root).toBe(ect);
      expect(level2!.root).toBe(ect);
      expect(leaf!.root).toBe(ect);
    });

    it('应该为ECT树中的所有节点提供EditableECTNode特有的方法', () => {
      // 创建一个基本的节点树
      const treeDef: NodeType = {
        type: 'series',
        name: 'root',
        children: [
          {
            type: 'action',
            name: 'action1'
          }
        ]
      };

      // 创建ECT
      const ect = createEditableECT(treeDef, mockEditableCP as any);
      const child = ect.children[0];

      // 验证EditableECTNode特有的方法存在且可用
      expect(typeof ect.cloneDeep).toBe('function');
      expect(typeof ect.toJSON).toBe('function');
      expect(typeof ect.equals).toBe('function');
      expect(typeof ect.getObjFromFormValues).toBe('function');
      expect(typeof ect.mergeFormValues).toBe('function');
      expect(typeof ect.addChild).toBe('function');
      expect(typeof ect.insert).toBe('function');
      expect(typeof ect.replaceWith).toBe('function');
      expect(typeof ect.replaceWithPlaceHolder).toBe('function');
      expect(typeof ect.remove).toBe('function');

      // 检查子节点上的方法
      expect(typeof child!.toJSON).toBe('function');
      expect(typeof child!.cloneDeep).toBe('function');
    });

    it('应该正确处理cloneDeep方法', () => {
      // 创建一个节点树
      const treeDef: NodeType = {
        type: 'series',
        name: 'root',
        children: [
          {
            type: 'action',
            name: 'action1'
          }
        ]
      };

      // 创建ECT
      const ect = createEditableECT(treeDef, mockEditableCP as any);

      // 克隆ECT
      const clonedEct = ect.cloneDeep();

      // 验证克隆是否成功且保持了结构
      expect(clonedEct).not.toBe(ect); // 应该是不同的实例
      expect(clonedEct._isEditableECTNode).toBe(true);
      expect(clonedEct.name).toBe('root');
      expect(clonedEct.children.length).toBe(1);
      expect(clonedEct.children[0]!.name).toBe('action1');

      // 验证子节点也是克隆的，而不是原来的引用
      expect(clonedEct.children[0]).not.toBe(ect.children[0]);

      // 验证克隆后的子节点仍然指向正确的父节点
      expect(clonedEct.children[0]!.parent).toBe(clonedEct);
    });

    it('应该提供正确的树结构导航方法', () => {
      // 创建一个节点树
      const treeDef: NodeType = {
        type: 'series',
        name: 'root',
        children: [
          {
            type: 'action',
            name: 'first'
          },
          {
            type: 'action',
            name: 'second'
          },
          {
            type: 'action',
            name: 'third'
          }
        ]
      };

      // 创建ECT
      const ect = createEditableECT(treeDef, mockEditableCP as any);

      // 获取子节点
      const first = ect.children[0]!;
      const second = ect.children[1]!;
      const third = ect.children[2]!;

      // 测试previousSibling和nextSibling
      expect(first.previousSibling).toBeUndefined(); // 第一个节点没有前一个兄弟节点
      expect(first.nextSibling).toBe(second);

      expect(second.previousSibling).toBe(first);
      expect(second.nextSibling).toBe(third);

      expect(third.previousSibling).toBe(second);
      expect(third.nextSibling).toBeUndefined(); // 最后一个节点没有下一个兄弟节点

      // 测试indexInParent
      expect(first.indexInParent).toBe(0);
      expect(second.indexInParent).toBe(1);
      expect(third.indexInParent).toBe(2);
    });
  });
});
