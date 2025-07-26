// 定义 EaogNode 类型为 cpNodeSchema 的推断类型
import {cpNodeSchema, z} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog.zod";
import {type EaogFramework} from "#/views/cp/models/eaog-framework";

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
export type IntegrationType = 'hook' | 'launch' | 'sync' | 'mount' | 'action';

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
}

// declare module '../../../../../../../aia-se-comp/src/eaog/cp-integration-manager.js' {
//   export class CPIntegrationManager {
//     /**
//      * 集成点数组
//      */
//     integrations: IntegrationPoint[];
//
//     /**
//      * 获取集成点列表
//      */
//     getIntegrations(): IntegrationPoint[];
//
//     /**
//      * 添加集成点
//      * @param integration 要添加的集成点
//      */
//     addIntegration(integration: IntegrationPoint): IntegrationPoint;
//
//     /**
//      * 移除集成点
//      * @param integration 要移除的集成点
//      */
//     removeIntegration(integration: IntegrationPoint): boolean;
//
//     /**
//      * 获取集成表达式
//      * @param type 集成点类型
//      * @param id 集成点ID
//      */
//     getIntegrationExp(type: IntegrationType, id?: string): string | null;
//
//
//     /**
//      * 获取从originIpath开始，到relativeNodeIpath的相对集成路径
//      * @param originIpath 原始集成路径
//      * @param integrationType 集成点类型
//      * @param integrationId 集成点ID
//      * @param relativeNodeIpath 相对节点集成路径
//      */
//     getRelativeIntegrationPath(originIpath: string, integrationType: IntegrationType, integrationId: string, relativeNodeIpath: string): string;
//
//     /**
//      * 加载集成点列表
//      * @param integrations 集成点列表
//      * @param parentIpath 父集成路径
//      */
//     loadIntegrations(integrations: IntegrationPoint[], parentIpath?: string): void;
//
//     hasIntegration(node: EaogNode, type: IntegrationType): boolean;
//
//     getIntegrations(node: EaogNode, type?: IntegrationType): IntegrationPoint[];
//   }
// }

