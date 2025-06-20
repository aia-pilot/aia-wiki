import type { Ref } from 'vue';

/**
 * 拖拽位置类型
 */
export type DropPosition = 'before' | 'child' | 'after' | null;

/**
 * 节点方向类型
 */
export type NodeDirection = 'vertical' | 'horizontal' | '';

/**
 * 节点交互事件处理函数类型
 */
export interface NodeEventHandlers {
  handleNodeClick: (event: MouseEvent) => void;
  toggleCollapse: (event: Event) => void;
  handleContextMenu: (event: MouseEvent) => void;
}

/**
 * 拖拽事件处理函数类型
 */
export interface DragEventHandlers {
  handleDragStart: (event: DragEvent) => void;
  handleDragEnd: (event: DragEvent) => void;
  handleDragEnter: (event: DragEvent) => void;
  handleDragLeave: (event: DragEvent) => void;
  handleDragOver: (event: DragEvent) => void;
  handleDrop: (event: DragEvent) => void;
}

/**
 * 拖拽状态
 */

export interface DragState {
  isDragging: Ref<boolean>;
  isDragOver: Ref<boolean>;
  dropPosition: Ref<DropPosition>;
}
/**
 * 节点类型UI配置
 */
export interface NodeTypeUIConfig {
  color: string;
  icon: string;
  description: string;
}
