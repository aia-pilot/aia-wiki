/**
 * 拖拽逻辑组合式函数
 */
import { ref } from 'vue';
import type { EditableEaogNode } from "#/views/cp/models/editable-eaog-node";
import type { DropPosition, DragState, DragEventHandlers } from '#/views/cp/types/node-types';
import { message } from 'ant-design-vue';
import Debug from 'debug';

const debug = Debug('aia:eaog-node:draggable');

/**
 * 提供节点拖拽相关逻辑的组合式函数
 *
 * @param node 当前节点
 * @returns 拖拽状态和事件处理函数
 */
export function useDraggable(node: EditableEaogNode) {
  // 拖拽状态
  const isDragging = ref(false);
  const isDragOver = ref(false);
  const dropPosition = ref<DropPosition>(null);

  // 拖拽开始
  const handleDragStart = (event: DragEvent) => {
    if (!event.dataTransfer) return;

    // 设置拖拽的数据
    event.dataTransfer.setData('text/plain', node.name);
    event.dataTransfer.setData('application/eaog-node', JSON.stringify({
      name: node.name,
      path: node.path
    }));

    // 设置拖拽效果
    event.dataTransfer.effectAllowed = 'move';

    // 更新拖拽状态
    isDragging.value = true;

    debug(`拖拽开始: ${node.name}`);
  };

  // 拖拽结束
  const handleDragEnd = () => {
    isDragging.value = false;
    isDragOver.value = false;  // 确保拖拽结束时重置拖放目标状态
    dropPosition.value = null; // 确保拖拽结束时重置拖放位置指示器
    debug(`拖拽结束: ${node.name}`);
  };

  // 拖拽进入目标区域
  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    isDragOver.value = true;
  };

  // 拖拽离开目标区域
  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    if (event.target === event.currentTarget) {
      isDragOver.value = false;
      dropPosition.value = null;
    }
  };

  // 拖拽在目标上方移动
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();

    if (!isDragOver.value) {
      isDragOver.value = true;
    }

    // 检测拖拽位置以显示对应的放置指示器
    if (event.currentTarget instanceof HTMLElement) {
      const rect = event.currentTarget.getBoundingClientRect();
      const offsetY = event.clientY - rect.top;
      const height = rect.height;

      // 计算放置位置
      dropPosition.value = calculateDropPosition(offsetY, height, node.isContainer);
    }
  };

  // 接收拖放
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();

    if (!event.dataTransfer) {
      resetDragState();
      return;
    }

    try {
      // 获取被拖拽的节点信息
      const dragData = event.dataTransfer.getData('application/eaog-node');
      const dragNodeInfo = JSON.parse(dragData);

      // 根据路径获取实际的节点对象
      const dragNode = node.root.getNodeByPath(dragNodeInfo.path);

      if (!dragNode) {
        debug('找不到被拖拽的节点');
        message.error('找不到被拖拽的节点');
        resetDragState();
        return;
      }

      // 防止拖拽到自己
      if (dragNode === node) {
        debug('不能拖拽节点到自身');
        resetDragState();
        return;
      }

      // 获取拖放位置，如果没有设置，则默认为 'after'
      const position = dropPosition.value || 'after';

      // 执行节点移动
      const success = dragNode.moveTo(node, position);

      if (success) {
        debug(`成功移动节点 "${dragNode.name}" 到 "${node.name}" ${position}`);
        // 标记为新修改以提供视觉反馈
        dragNode.markAsNewlyModifiedForAWhile();

        // 直接使用querySelectorAll清除所有拖拽相关样式，简洁高效
        document.querySelectorAll('.eaog-node').forEach(el => {
          el.classList.remove('drag-over', 'drop-before', 'drop-after', 'drop-child');
        });
      } else {
        debug('节点移动失败');
        message.error('无法移动节点，可能会造成循环引用');
      }
    } catch (error) {
      debug('拖拽处理错误', error);
      message.error('拖拽处理发生错误');
    }

    // 处理完毕后重置拖拽状态
    resetDragState();
  };

  // 重置拖拽状态
  const resetDragState = () => {
    isDragOver.value = false;
    dropPosition.value = null;
  };

  // 计算放置位置
  const calculateDropPosition = (offsetY: number, height: number, isContainer: boolean): DropPosition => {
    if (!isContainer) {
      // 非容器节点只允许放在前面或后面
      return offsetY < height * 0.5 ? 'before' : 'after';
    } else {
      // 容器节点允许放在前面、内部或后面
      if (offsetY < height * 0.3) {
        return 'before';
      } else if (offsetY < height * 0.7) {
        return 'child';
      } else {
        return 'after';
      }
    }
  };

  // 导出拖拽状态和事件处理函数
  const dragState: DragState = {
    isDragging,
    isDragOver,
    dropPosition
  };

  const dragHandlers: DragEventHandlers = {
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop
  };

  return {
    ...dragState,
    ...dragHandlers
  };
}
