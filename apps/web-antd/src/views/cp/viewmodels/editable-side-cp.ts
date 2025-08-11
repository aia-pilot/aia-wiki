import type {SideCP, SyncPoint} from "../models/types";
import type {EditableCP} from "#/views/cp/viewmodels/editable-cp";
import type {EditableEaogNode} from "#/views/cp/models/editable-eaog-node";
import {findNodeByBriefPath} from "../../../../../../../aia-eaog/src/tree-utils";
import {omit} from "lodash-es";
import {findNodeByIpath} from "../../../../../../../aia-se-comp/src/eaog/cp-integration-manager";

/**
 * EditableSyncPoint 类实现
 */
export class EditableSyncPoint implements SyncPoint {
  actor: SyncPoint["actor"] & { node?: EditableEaogNode };
  /** 在{@link Integration#loadAndOpen} 时，加载为node */
  waiter: SyncPoint["waiter"] & { node?: EditableEaogNode };
  /** 在{@link Integration#loadAndOpen} 时，加载为node */
  exePhase: SyncPoint["exePhase"];
  block: SyncPoint["block"];
  description: SyncPoint["description"];

  constructor(data: SyncPoint) {
    this.actor = data.actor;
    this.waiter = data.waiter;
    this.exePhase = data.exePhase;
    this.block = data.block;
    this.description = data.description;
  }

  get label() {
    return this.description ? this.description : `${this.actor.node?.name} (${this.exePhase}) -> ${this.waiter.node?.name} (${this.exePhase})`;
  }

  toJSON() {
    return omit(this, 'actor.node', 'waiter.node'); // 去除node属性，因为它是EditableEaogNodeVMType实例，不需要序列化
  }

  cloneDeep() {
    const clone = new EditableSyncPoint(this.toJSON());
    clone.actor.node = this.actor.node; // 保留node引用
    clone.waiter.node = this.waiter.node; // 保留node引用
    return clone;
  }

  updateActor(actor: SyncPoint["actor"]) {
    this.actor = actor;
  }

  updateWaiter(waiter: SyncPoint["waiter"]) {
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

  loadActorAndWaiter(actorEaog: EditableEaogNode, waiterEaog: EditableEaogNode) {
    // 注意：actor的path，为了延伸集成，其实是ipath格式。而waiter的path则是path格式。
    //  统一用`path`，是为了LLM便于理解
    this.actor.node = findNodeByIpath(actorEaog, this.actor.path);
    this.waiter.node = findNodeByBriefPath(waiterEaog, this.waiter.path);
  }
}

/**
 * EditableSideCP 类实现
 */
export class EditableSideCP implements SideCP {
  cp: string;
  launchPoint: string | EditableEaogNode;    // 启动点，主CP的briefPath
  definedAt: EditableCP; // 定义位置，在哪个CP中定义的
  actorCP?: EditableCP;    // 主CP，本SideCP的集成、发起CP，非延伸集成时同definedAt。延伸集成时，是definedAt的延伸
  waiterCP?: EditableCP;  // 副CP
  launchNode?: EditableEaogNode; // 启动点，主CP的节点
  syncPoints: EditableSyncPoint[];

  constructor(sideCP: SideCP, definedAt: EditableCP) {
    this.definedAt = definedAt;
    this.cp = sideCP.cp;
    this.launchPoint = sideCP.launchPoint;
    this.syncPoints = (sideCP.syncPoints || []).map(sp => new EditableSyncPoint(sp));
  }

  toJSON(): SideCP {
    const syncPoints = this.syncPoints.map(sp => sp.toJSON());
    return {...omit(this, ['definedAt', 'launchNode', 'actorCP', 'waiterCP']), syncPoints}; /* 去除cp实例，保留cp的JSON表示 */
  }

  cloneDeep(): EditableSideCP {
    const clone = new EditableSideCP(this.toJSON(), this.definedAt); // 深度克隆，但definedAt浅拷贝
    clone.waiterCP = this.waiterCP; // 保留cp实例引用
    clone.syncPoints = this.syncPoints.map(sp => sp.cloneDeep()); // 深度克隆syncPoints
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

  integrate(actorCP: EditableCP, waiterCP: EditableCP) {
    this.actorCP = actorCP;
    this.waiterCP = waiterCP;
    this.launchNode = findNodeByIpath(actorCP.eaog, this.launchPoint) as EditableEaogNode;
    this.syncPoints.forEach(sp => sp.loadActorAndWaiter(actorCP.eaog, waiterCP.eaog))
  }
}

