import { nextTick } from 'vue'
import type { Sync, IntegrationPoint } from 'aia-cpm/cpi'

export class EditableEctNodePositionManager {
  /**
   * 节点顶部外部间隔，用于调节节点垂直方向位置，对齐 主程<->辅程 同步节点，保障时间隐喻。
   * 此值将响应式更新到 div.eaog-node marginTop。
   */
  marginTop: number = 0;
  /**
   * 节点顶部内部间隔，用于调节节点垂直方向位置，对齐 主程<->辅程 同步节点，保障时间隐喻。
   * 此值将响应式更新到 div.eaog-node paddingTop。
   */
  paddingTop: number = 0;

  constructor(public ui: EditableEctNodeVM) {}

  get bbox() {
    return this.ui.dom?.getBoundingClientRect();
  }

  get headerBbox() {
    const headerEl = this.ui.dom?.querySelector('.eaog-node-header');
    return headerEl?.getBoundingClientRect();
  }

  get launchPointY() {
    return this.bbox!.top;
  }

  get startPointY() {
    return this.headerBbox!.top;
  }

  get endPointY() {
    return this.bbox!.bottom;
  }

  get verticalSortedNodes() {
    return this.ui.model.nodes.sort((a, b) => a.ui.positionManager.bbox!.top - b.ui.positionManager.bbox!.top);
  }

  alignLaunchPointTo(targetY: number) {
    const deltaY = Math.max(targetY - this.launchPointY, 0); // 只增不减（align的语义是对齐到或更低位置，即在之后发生）
    this.marginTop += deltaY;
  }

  alignStartPointTo(targetY: number) {
    const deltaY = Math.max(targetY - this.startPointY, 0); // 只增不减（align的语义是对齐到或更低位置，即在之后发生）
    this.paddingTop += deltaY;
  }
}

async function alignSyncNodesPositionY(sync: Sync) {
  const actorPM = sync.actor.node.ui.showNode.ui.positionManager; // 有可能是启动点，显示的是辅程根节点，所以要用showNode。
  const waiterPM = sync.waiter.node.ui.positionManager;
  if (sync.actor.phase === 'before') {
    waiterPM.alignLaunchPointTo(actorPM.launchPointY);
    if (sync.actor.block) {
      await waitVueRepaintDOM();
      actorPM.alignStartPointTo(waiterPM.endPointY);
    }
  } else {
    waiterPM.alignStartPointTo(actorPM.endPointY);
  }
}

/**
 * 等待Vue完成DOM更新和浏览器重绘
 */
export async function waitVueRepaintDOM() {
  await nextTick();
  await new Promise(requestAnimationFrame);
}

/**
 * 对齐并行集成中的同步关系，让启动点子树上的节点和辅程树节点，在垂直方向上，按照同步关系对齐。
 * TODO：现在类似贪心算法，每次渲染，效率不高。后继可考虑先排序依赖关系，然后一次性计算位置。
 * @param ip
 */
export async function alignParallelIntegrationSyncPositionY(ip: IntegrationPoint) {
  ip.integratedECT.ui.positionManager.alignLaunchPointTo(ip.launchNode.ui.positionManager.launchPointY);
  await waitVueRepaintDOM();
  for (const sync of ip.syncs) {
    await alignSyncNodesPositionY(sync);
    await waitVueRepaintDOM();
  }
}
