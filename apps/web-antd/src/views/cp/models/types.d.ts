// 定义 EaogNode 类型为 cpNodeSchema 的推断类型
import {cpNodeSchema, z} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog.zod";
// import {type EaogFramework} from "#/views/cp/models/eaog-framework";
import type {EditableECTNode} from "#/views/cp/models/ect/editable-ect";

export type EaogNode = z.infer<typeof cpNodeSchema>;

/**
 * Hook类是IntegrationPoint的实现，实际上IntegrationPoint总是通过Hook类来实现的
 */
export interface Hook extends IntegrationPoint {
  hook: 'before' | 'after';
  action: string | Record<string, any>;
  params?: Record<string, any>;
}

// SideCP 类型定义
export type SideCP = {
  cp: string | EditableCP;              /** cpLocateStr {@link convertCpLocateStrToRelativePath} */
  launchPoint: string | EditableECTNode;     /** 启动点，主CP的briefPath {@link findNodeByBriefPath} */
  syncPoints: SyncPoint[]; // 同步点数组
};


/**
 * SyncPoint 类型定义
 * @see {@link module:eaog.SyncPoint}
 */
export type SyncPoint = {
  actor: { // 主CP 充当 Actor
    path: string; /** ipath {@link ipath} */
    onSync?: string | ((actorNode: EaogNode, waiterNode: EaogNode) => void);  /** actionUri {@link ActionManager} */
    node?: EditableECTNode; /** 节点实例，集成、加载后的对应节点 */
  };
  waiter: { // 辅CP 充当 Waiter
    path: string;  /** ipath {@link ipath} */
    onSync?: string | ((actorNode: EaogNode, waiterNode: EaogNode) => void); /** actionUri {@link ActionManager} */
    node?: EditableECTNode; /** 节点实例，集成、加载后的对应节点 */
  };
  phase: "before" | "after"; // 在 Actor 执行前或执行后触发同步
  block: boolean;              // 是否等待 Waiter 完成后再继续执行
  description: string;         // 同步点描述
};

// CP 类型定义
export type CP = {
  eaog: EaogNode; // CP 的 EAOG 数据
  hooks?: Hook[]; // CP 的 Hook 列表
  sideCPs?: SideCP[]; // CP 的侧边 CP 列表
  frameworks?: EaogFramework[]; // CP 使用的 EAOG Framework 列表
  filePath?: string; // 可选的文件路径，用于本地存储
}


/**
 * 集成点Schema验证定义
 */

/**
 * 集成管理器基类
 */

/**
 * 集成点的类型定义
 */
export type IntegrationType = 'hook' | 'launch' | 'sync' | 'mount' | 'action' | 'use';

/**
 * 集成点接口
 */
export interface IntegrationPoint {
  type: IntegrationType;
  id?: string;
  name: string;
  description?: string;
  block: boolean;
  path: string;
  ipath?: string;
  sideCP?: SideCP; // 副CP定义
  hook?: 'before' | 'after'; // 集成点的Hook类型
  cpLocateStr?: string; // CP加载字符串，表示集成点所在的CP
  launchHook?: Hook; // 启动集成的Hook
}

