/**
 * 节点交互逻辑组合式函数
 */
import type { EditableEaogNode } from "#/views/cp/models/editable-eaog-node";
import type { NodeEventHandlers } from '#/views/cp/types/node-types';
import Debug from 'debug';

const debug = Debug('aia:eaog-node:interaction');

/**
 * 提供节点交互相关逻辑的组合式函数
 *
 * @param node 当前节点
 * @returns 节点交互事件处理函数
 */
export function useNodeInteraction(node: EditableEaogNode): NodeEventHandlers {
  // 处理节点点击
  const handleNodeClick = (event: MouseEvent) => {
    debug(`Node clicked: ${node.name}`);
    // 使用EditableEaogNode的click方法，直接更新节点状态
    node.click(true, event.shiftKey);
  };

  // 处理折叠/展开按钮点击
  const toggleCollapse = (event: Event) => {
    event.stopPropagation(); // 阻止事件冒泡，避免触发节点的点击事件
    node.toggleCollapse(); // 使用EditableEaogNode的toggleCollapse方法
    debug(`Node ${node.name} ${node.isCollapsed ? 'collapsed' : 'expanded'}`);
  };

  // 处理系统右键菜单事件，附加当前node
  const handleContextMenu = (event: MouseEvent) => {
    debug(`Context menu for node: ${node.name}`);
    // 设置node为当前点击的节点
    node.click(false); // 只设置为点击状态，不改变选中状态
    // @ts-ignore 将当前节点附加到事件对象上，以便在右键菜单中使用
    event.eaogNode = node;
  };

  return {
    handleNodeClick,
    toggleCollapse,
    handleContextMenu
  };
}
