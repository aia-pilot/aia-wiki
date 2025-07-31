import type {SideCP, SyncPoint} from "../models/types";
import type {EditableCP} from "#/views/cp/viewmodels/editable-cp";
import type {EditableEaogNodeVMType} from "#/views/cp/viewmodels/editable-eaog-node-vm";
import {findNodeByBriefPath} from "../../../../../../../aia-eaog/src/tree-utils";
import {omit} from "lodash-es";

/**
 * EditableSyncPoint 类实现
 */
export class EditableSyncPoint implements SyncPoint {
  actor: SyncPoint.actor & {node: EditableEaogNodeVMType}; // Actor初始化时，就已经加载为Node
  waiter: SyncPoint.waiter; // Waiter在loadWaiter时加载为Node
  exePhase: SyncPoint.exePhase;
  block: SyncPoint.block;
  description: SyncPoint.description;

  constructor(data: SyncPoint) {
    this.actor = data.actor;
    this.waiter = data.waiter;
    this.exePhase = data.exePhase;
    this.block = data.block;
    this.description = data.description;
  }

  toJSON() {
    return omit(this, 'actor.node', 'waiter.node'); // 去除node属性，因为它是EditableEaogNodeVMType实例，不需要序列化
  }

  updateActor(actor: SyncPoint.actor) {
    this.actor = actor;
  }

  updateWaiter(waiter: SyncPoint.waiter) {
    this.waiter = waiter;
  }

  updateDescription(desc: string) {
    this.description = desc;
  }

  setBlock(block: boolean) {
    this.block = block;
  }

  setExePhase(phase: "before" | "after") {
    this.exePhase = phase;
  }
}

/**
 * EditableSideCP 类实现
 */
export class EditableSideCP implements SideCP {
  integrator: EditableCP; // 集成点，本SideCP的集成、发起CP
  cp: string;
  cpInstance?: EditableCP; // 加载后的CP实例
  launchPoint: string;    // 启动点，主CP的briefPath
  launchNode: EditableEaogNodeVMType; // 启动点，主CP的节点
  syncPoints: EditableSyncPoint[];

  constructor(sideCP: SideCP, integrator: EditableCP) {
    this.integrator = integrator;
    this.cp = sideCP.cp;
    this.launchPoint = sideCP.launchPoint;
    this.launchNode = findNodeByBriefPath(integrator.eaog, sideCP.launchPoint) as EditableEaogNodeVMType;
    this.syncPoints = (sideCP.syncPoints || []).map(sp => {
      const node = findNodeByBriefPath(integrator.eaog, sp.actor.path);
      return new EditableSyncPoint({...sp, actor: {...sp.actor, node}})
    });
  }

  toJSON(): SideCP {
    const syncPoints = this.syncPoints.map(sp => sp.toJSON());
    return {...omit(this, ['integrator', 'launchNode', 'cpInstance']), syncPoints}; // 去除cp实例，保留cp的JSON表示
  }

  cloneDeep(): EditableSideCP {
    const clone = new EditableSideCP(this.toJSON(), this.integrator); // 深度克隆，但integrator浅拷贝
    clone.cpInstance = this.cpInstance; // 保留cp实例引用
    return clone;
  }


  addSyncPoint(syncPoint: EditableSyncPoint) {
    this.syncPoints.push(syncPoint);
  }

  removeSyncPoint(index: number) {
    this.syncPoints.splice(index, 1);
  }

  updateSyncPoint(index: number, syncPoint: EditableSyncPoint) {
    this.syncPoints[index] = syncPoint;
  }
}

