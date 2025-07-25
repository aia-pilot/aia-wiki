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

declare module '../../../../../../../aia-se-comp/src/eaog/cp-integration-manager.js' {
  export class CPIntegrationManager {
    /**
     * 集成点数组
     */
    integrations: IntegrationPoint[];

    /**
     * 为EAOG节点添加集成路径
     * @param node 要添加路径的节点
     * @param parentIpath 父节点的集成路径
     */
    addIpathForEaog(node: EaogNode, parentIpath: string | null): void;

    /**
     * 获取集成点列表
     */
    getIntegrations(): IntegrationPoint[];

    /**
     * 根据路径和类型获取集成点
     * @param path 集成点路径
     * @param type 集成点类型
     */
    getIntegrationByPath(path: string, type: string): IntegrationPoint | undefined;

    /**
     * 添加集成点
     * @param integration 要添加的集成点
     */
    addIntegration(integration: IntegrationPoint): IntegrationPoint;

    /**
     * 移除集成点
     * @param integration 要移除的集成点
     */
    removeIntegration(integration: IntegrationPoint): boolean;

    /**
     * 获取集成表达式
     * @param type 集成点类型
     * @param id 集成点ID
     */
    getIntegrationExp(type: IntegrationType, id?: string): string | null;

    /**
     * 获取集成点的集成路径，即从集成点进入被集成CP时的paretnIpath
     * @param node 节点
     * @param type 集成点类型
     * @param id 集成点ID
     */
    getIntegrationPath(node: EaogNode, type: IntegrationType, id?: string): string;

    /**
     * 获取从originIpath开始，到relativeNodeIpath的相对集成路径
     * @param originIpath 原始集成路径
     * @param integrationType 集成点类型
     * @param integrationId 集成点ID
     * @param relativeNodeIpath 相对节点集成路径
     */
    getRelativeIntegrationPath(originIpath: string, integrationType: IntegrationType, integrationId: string, relativeNodeIpath: string): string;

    /**
     * 加载集成点列表
     * @param integrations 集成点列表
     * @param parentIpath 父集成路径
     */
    loadIntegrations(integrations: IntegrationPoint[], parentIpath?: string): void;

    hasIntegration(node: EaogNode, type: IntegrationType): boolean;

    getIntegrations(node: EaogNode, type?: IntegrationType): IntegrationPoint[];
  }
}

/**
 * Hook管理器模块
 */
declare module '../../../../../../../aia-se-comp/src/eaog/hook-manager.js' {
  /**
   * 将CP定义的hooks集成到eaog上
   * @param eaog 当前eaog
   * @param hookDefs 当前CP（eaog）定义的hooks
   * @param parentIpath 集成路径，即将eaog集成进来的node的ipath，顶层为null
   */
  export function integrateEaogHooks(eaog: EaogNode, hookDefs: Hook[], parentIpath: string | null): void;
}

/**
 * Side CP管理器模块
 */
declare module '../../../../../../../aia-se-comp/src/eaog/side-cp-manager.js' {
  /**
   * 创建Side CP对应的hooks，通过这些hooks来启动，和实现Side CP的同步
   * @param eaog 当前要执行的eaog节点
   * @param cpNode 发起执行当前eaog的cpNode，UR顶层时为null
   * @param sideCPs 伴随CP定义数组
   * @param cpRunner CP执行器实例，用于执行sideCPs
   * @returns 集成的side CP hooks
   */
  export function integrateSideCpsAsHooks(
    eaog: EaogNode,
    cpNode: EaogNode | null,
    sideCPs: { cp: CP | string, launchPoint: string, syncPoints: SyncPoint[] }[] | null,
    cpRunner: any | null
  ): any[];
}
