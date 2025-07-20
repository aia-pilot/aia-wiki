// 定义 EaogNode 类型为 cpNodeSchema 的推断类型
import {cpNodeSchema, z} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog.zod";
import {type EaogFramework} from "#/views/cp/models/eaog-framework";

export type EaogNode = z.infer<typeof cpNodeSchema>;

// Hook 类型定义
export type Hook = {
  name: string;           // Hook 名称
  type: "async" | "sync"; // Hook 类型：异步或同步，异步不会阻塞执行，同步会
  hook: "before" | "after"; // 执行时机：执行前或执行后
  path: string;           /** Hook 挂载的路径 briefPath {@link findNodeByBriefPath} */
  action: string;         /** Hook本身执行的行动，actionUri {@link ActionManager} */
  params: Record<string, any>; // 动作的参数
};

// SideCP 类型定义
export type SideCP = {
  cp: string;              /** cpLocateStr {@link parseCpModuleLocateStr} */
  launchPoint: string;     /** 启动点，主CP的briefPath {@link findNodeByBriefPath} */
  syncPoints: SyncPoint[]; // 同步点数组
};


/**
 * SyncPoint 类型定义
 * @see {@link module:eaog.SyncPoint}
 */
export type SyncPoint = {
  actor: { // 主CP 充当 Actor
    path: string; /** briefPath {@link findNodeByBriefPath} */
    onSync?: string | ((actorNode: EaogNode, waiterNode: EaogNode) => void);  /** actionUri {@link ActionManager} */
  };
  waiter: { // 辅CP 充当 Waiter
    path: string;  /** briefPath {@link findNodeByBriefPath} */
    onSync?: string | ((actorNode: EaogNode, waiterNode: EaogNode) => void); /** actionUri {@link ActionManager} */
  };
  exePhase: "before" | "after"; // 在 Actor 执行前或执行后触发同步
  block: boolean;              // 是否等待 Waiter 完成后再继续执行
  description: string;         // 同步点描述
};

// CP 类型定义
export type CP = {
  eaog: EaogNode; // CP 的 EAOG 数据
  hooks?: Hook[]; // CP 的 Hook 列表
  sideCPs?: SideCP[]; // CP 的侧边 CP 列表
  frameworks?: EaogFramework[]; // CP 使用的 EAOG Framework 列表
}

