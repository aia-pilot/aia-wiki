import { ref } from 'vue';
import type { EditableCP } from '../../models/ect/editable-cp';
import type { EditableECTNode } from '../../models/ect/editable-ect';

/**
 * EditableCPVM - 负责CP的UI交互状态和行为
 * 管理CP的主程、辅程以及活跃CP的状态
 */
export class EditableCPVM {
  model: EditableCP; // 关联的 EditableCP 实例
  private sideCPs = ref<EditableCP[]>([]); // 存储辅程CP数组

  constructor(model: EditableCP) {
    this.model = model;
  }

  /**
   * 获取主程CP（自己）
   */
  get main(): EditableCP {
    return this.model;
  }

  /**
   * 获取界面中显示的辅程CP数组
   */
  get sides(): EditableCP[] {
    return this.sideCPs.value as EditableCP[];
  }

  /**
   * 设置辅程CP数组
   * @param cps 要设置的辅程CP数组
   */
  setSides(cps: EditableCP[]): void {
    this.sideCPs.value = cps;
  }

  /**
   * 添加辅程CP
   * @param cp 要添加的辅程CP
   */
  addSide(cp: EditableCP): void {
    if (!this.sideCPs.value.includes(cp)) {
      this.sideCPs.value.push(cp);
    }
  }

  /**
   * 移除辅程CP
   * @param cp 要移除的辅程CP
   */
  removeSide(cp: EditableCP): void {
    const index = this.sideCPs.value.indexOf(cp);
    if (index !== -1) {
      this.sideCPs.value.splice(index, 1);
    }
  }

  /**
   * 从当前节点倒推，找到当前活跃的CP TODO: reactive watch?
   * @param currentNode 当前选中的节点
   */
  getActiveCPFromNode(currentNode?: EditableECTNode): EditableCP | undefined {
    // 如果没有当前节点，返回主程
    if (!currentNode) {
      return this.main;
    }

    // 从当前节点倒推，找到它所属的CP
    return currentNode.cp;
  }

  /**
   * 判断一个CP是否为当前活跃的CP
   * @param cp 要检查的CP
   * @param currentNode 当前选中的节点
   */
  isActiveCP(cp: EditableCP, currentNode?: EditableECTNode): boolean {
    return this.getActiveCPFromNode(currentNode) === cp;
  }

  /**
   * 获取指定CP所属的CP类型（主程或辅程）
   * @param cp 要检查的CP
   */
  getCPType(cp: EditableCP): 'main' | 'side' | undefined {
    if (cp === this.main) {
      return 'main';
    }

    if (this.sides.includes(cp)) {
      return 'side';
    }

    return undefined;
  }
}
