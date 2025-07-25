// @ts-nocheck
import type { CP } from './types.d';
import type { EditableEaogNode } from './editable-eaog-node';


/**
 * 集成CP的类型枚举
 */
export enum IntegratedCPType {
  Action = 'action',
  Hook = 'hook',
  SideCPLaunchPoint = 'launch', // 辅助CP-启动点
  SideCPSyncPoint = 'sync', // 辅助CP-同步点
  FrameworkMountPoint = 'mount' // 框架-加载点
}

/**
 * 集成CP的展示方式类型
 */
export type ShowAsType = 'before' | 'after' | 'replace' | 'parallel';

/**
 * 集成CP类
 */
export class IntegratedCP {
  // 业务属性
  node: EditableEaogNode;           // 对应的节点
  type: IntegratedCPType;           // 集成CP的类型
  syncTo?: string;                  // 同步点路径（SyncPoint的waiter.path）

  // 视觉、交互属性
  showAt: ShowAsType;               // 如何呈现，与主CP的关系。block执行的，将在原节点处，前、后插入，或替换。非block执行的，将在并行面板中展示。
  cpLocateStr: string;              // CP定位字符串，如: 'cp://cp-module/path/to/cp'
  isShown: boolean;                 // 当前是否在界面呈现

  /**
   * 构造函数
   * @param node 对应的节点
   * @param type 集成CP类型
   * @param cpLocateStr CP定位字符串
   * @param showAt 如何展示，当前节点前、后，或替换原节点，或并行展示
   * @param syncTo 同步点路径（可选）
   */
  constructor(node: EditableEaogNode, type: IntegratedCPType, cpLocateStr: string, showAt: ShowAsType, syncTo?: string) {
    this.node = node;
    this.type = type;
    this.cpLocateStr = cpLocateStr;
    this.showAt = showAt;
    this.syncTo = syncTo;
    this.isShown = false
  }

  /**
   * 在Editor中打开集成CP
   */
  async open() {
    const {loadCpFromCpStr} = await import('#/views/cp/models/cp-loader')
    const {createEditableCP} = await import('#/views/cp/models/editable-cp');
    const {parallelCP} = await import('#/views/cp/models/cp-editor-state');
    let {cp, filePath} = await loadCpFromCpStr(this.cpLocateStr);
    cp = createEditableCP(cp, filePath, this.node.cp); // 创建EditableCP实例
    // @ts-ignore
    cp.integratedCP = this; // 关联当前集成CP到CP模块
    this.showAt === 'replace' ? this.node.integratedCPReplaceNode = cp.eaog
      : this.showAt === 'before' ? this.node.integratedCPBeforeNode = cp.eaog
      : this.showAt === 'after' ? this.node.integratedCPAfterNode = cp.eaog
        : this.showAt === 'parallel' ? parallelCP.value = cp
          : null
    this.isShown = true; // 标记为已展示
  }

  async close() {
    const {parallelCP} = await import('#/views/cp/models/cp-editor-state');
    this.showAt === 'replace' ? this.node.integratedCPReplaceNode = undefined
      : this.showAt === 'before' ? this.node.integratedCPBeforeNode = undefined
      : this.showAt === 'after' ? this.node.integratedCPAfterNode = undefined
        : this.showAt === 'parallel' ? parallelCP.value = undefined
          : null;
    this.isShown = false; // 标记为未展示
  }

  async toggle() {
    if (this.isShown) {
      await this.close();
    } else {
      await this.open();
    }
  }
}

/**
 * 集成CP管理器，管理节点相关的所有集成CP
 */
export class IntegratedCPManager {
  private integratedCPs: IntegratedCP[] = [];
  private node: EditableEaogNode;
  private readonly cp: CP | undefined;

  /**
   * 构造函数，分析并收集节点对应的所有集成CP
   * @param node 节点
   */
  constructor(node: EditableEaogNode) {
    this.node = node;
    this.cp = node.cp;
    this.collectIntegratedCPs();
  }

  /**
   * 收集节点相关的所有集成CP
   */
  private collectIntegratedCPs(): void {
    // 清空现有的集成CP列表
    this.integratedCPs = [];

    // 分析节点的action属性
    this.collectActionCP();

    // 分析hooks中action指向的CP
    this.collectHooksCP();

    // 分析sideCP的launchPoint和syncPoints
    this.collectSideCPsCP();

    // 分析frameworks的mountPoints
    this.collectFrameworksMountPointsCP();
  }

  /**
   * 收集节点action属性指向的CP
   */
  private collectActionCP(): void {
    if (this.node.action && typeof this.node.action === 'string' && this.node.action.startsWith('cp://')) {
      this.integratedCPs.push(new IntegratedCP(
        this.node,
        IntegratedCPType.Action,
        this.node.action,
        // @ts-ignore TODO：node添加block属性，让action可以非阻塞执行
        this.node.block ?? true ? 'replace' : 'parallel' // 如果是阻塞执行，则集成在当前节点，否则并行展示
      ));
    }
  }

  /**
   * 收集hooks中action指向的CP
   */
  private collectHooksCP(): void {
    if (!this.cp?.hooks) return;

    // 找出与当前节点相关的hooks
    const nodeHooks = this.cp.hooks.filter(hook => {
      // 判断hook的path是否与当前节点匹配
      return this.isNodeMatch(hook.path);
    });

    // 收集hooks中action指向的CP
    for (const hook of nodeHooks) {
      if (hook.action && hook.action.startsWith('cp://')) {
        this.integratedCPs.push(new IntegratedCP(
          this.node,
          IntegratedCPType.Hook,
          hook.action,
          hook.block ?? false ? (hook.hook /* 'before' | 'after' */) : 'parallel' // 如果是阻塞执行，则集成在当前节点，否则并行展示
        ));
      }
    }
  }

  private isNodeMatch(path: string) { /** 注意：这个是hack，实际上重构 {@link Hook#findMatchedNode} 的算法 */
    return path.endsWith(this.node.name);
    // return path === this.node.name || path === this.node.path;
  }

  /**
   * 收集sideCP的launchPoint和syncPoints指向的CP
   */
  private collectSideCPsCP(): void {
    if (!this.cp?.sideCPs) return;

    // 检查sideCPs的launchPoint
    for (const sideCP of this.cp.sideCPs) {
      // 判断launchPoint是否与当前节点匹配
      if (this.isNodeMatch(sideCP.launchPoint)) {
        this.integratedCPs.push(new IntegratedCP(
          this.node,
          IntegratedCPType.SideCPLaunchPoint,
          sideCP.cp,
          'parallel' // SideCP总是和主CP并行执行
        ));
      }

      // 检查syncPoints
      for (const syncPoint of sideCP.syncPoints || []) {
        // 判断actor的path是否与当前节点匹配
        if (this.isNodeMatch(syncPoint.actor.path)) {
          this.integratedCPs.push(new IntegratedCP(
            this.node,
            IntegratedCPType.SideCPSyncPoint,
            sideCP.cp,
            'parallel', // SideCP的syncPoint通常是并行执行
            syncPoint.waiter.path // syncTo waiter.path
          ));
        }
      }
    }
  }

  /**
   * 收集frameworks的mountPoints指向的CP
   */
  private collectFrameworksMountPointsCP(): void {
    if (!this.cp?.frameworks) return;

    for (const framework of this.cp.frameworks) {
      // 检查框架的所有挂载点
      for (const mountPoint of framework.mountPoints || []) {
        // 判断挂载点是否与当前节点匹配
        if (this.isNodeMatch(mountPoint.path)) {
          const integratedCP = new IntegratedCP(
            this.node,
            IntegratedCPType.FrameworkMountPoint,
            framework.cp, // TODO: 从cp实例，反射获取cpLocateStr
            'replace' // 框架挂载点将被替换为框架
          );
          this.integratedCPs.push(integratedCP);
        }
      }
    }
  }

  /**
   * 判断是否包含指定类型的集成CP
   * @param type 集成CP类型
   */
  has(type?: IntegratedCPType): boolean {
    return type ? this.integratedCPs.some(cp => cp.type === type) : this.integratedCPs.length > 0;
  }

  /**
   * 获取集成CP的数量
   * @param type 集成CP类型（可选）
   */
  count(type?: IntegratedCPType): number {
    return type ? this.integratedCPs.filter(cp => cp.type === type).length : this.integratedCPs.length;
  }

  /**
   * 根据类型获取集成CP列表
   * @param type 集成CP类型
   */
  getCPsByType(type: IntegratedCPType): IntegratedCP[] {
    return this.integratedCPs.filter(cp => cp.type === type);
  }

  get(type: IntegratedCPType): IntegratedCP | undefined {
    return this.integratedCPs.find(cp => cp.type === type);
  }

  /**
   * 查找匹配条件的第一个集成CP
   * @param predicate 查找条件
   */
  find(predicate: (cp: IntegratedCP) => boolean): IntegratedCP | undefined {
    return this.integratedCPs.find(predicate);
  }

  /**
   * 查找所有匹配条件的集成CP
   * @param predicate 查找条件
   */
  findAll(predicate: (cp: IntegratedCP) => boolean): IntegratedCP[] {
    return this.integratedCPs.filter(predicate);
  }

  /**
   * 获取所有集成CP
   */
  getAll(): IntegratedCP[] {
    return [...this.integratedCPs];
  }

  /**
   * 添加集成CP
   * @param integratedCP 要添加的集成CP
   * @param updateCP 是否同时更新CP对象
   */
  addIntegratedCP(integratedCP: IntegratedCP, updateCP: boolean = true): void {
    // 添加到集成CP列表
    this.integratedCPs.push(integratedCP);

    // 如果需要更新CP对象
    if (updateCP && this.cp) {
      this.updateCPAccordingToIntegratedCP(integratedCP, true);
    }
  }

  /**
   * 移除集成CP
   * @param integratedCP 要移除的集成CP
   * @param updateCP 是否同时更新CP对象
   */
  removeIntegratedCP(integratedCP: IntegratedCP, updateCP: boolean = true): void {
    // 从集成CP列表中移除
    const index = this.integratedCPs.findIndex(cp =>
      cp.type === integratedCP.type && cp.cpLocateStr === integratedCP.cpLocateStr);

    if (index !== -1) {
      this.integratedCPs.splice(index, 1);

      // 如果需要更新CP对象
      if (updateCP && this.cp) {
        this.updateCPAccordingToIntegratedCP(integratedCP, false);
      }
    }
  }

  /**
   * 根据集成CP更新CP对象
   * @param integratedCP 集成CP
   * @param isAdd 是添加还是移除
   * TODO: 待调试、完善
   */
  private updateCPAccordingToIntegratedCP(integratedCP: IntegratedCP, isAdd: boolean): void {
    const cp = this.cp as CP;
    if (!cp) return;

    switch (integratedCP.type) {
      case IntegratedCPType.Action:
        // 不能通过此方法更新节点的action属性，action属性通过直接修改节点对象来更新。
        throw new Error("Cannot update Action via IntegratedCPManager. Use node.action directly.");

      case IntegratedCPType.Hook:
        // 更新hooks
        if (cp.hooks) {
          if (isAdd) {
            // 添加hook
            cp.hooks.push({
              name: `hook_${Date.now()}`,
              type: "sync",
              hook: "before",
              path: this.node.path,
              action: integratedCP.cpLocateStr,
              params: {}
            });
          } else {
            // 移除匹配的hook
            const hookIndex = cp.hooks.findIndex(h =>
              h.path === this.node.path && h.action === integratedCP.cpLocateStr);
            if (hookIndex !== -1) {
              cp.hooks.splice(hookIndex, 1);
            }
          }
        } else if (isAdd) {
          cp.hooks = [{
            name: `hook_${Date.now()}`,
            type: "sync",
            hook: "before",
            path: this.node.path,
            action: integratedCP.cpLocateStr,
            params: {}
          }];
        }
        break;

      case IntegratedCPType.SideCPLaunchPoint:
        // 更新sideCPs的launchPoint
        if (cp.sideCPs) {
          if (isAdd) {
            // 添加sideCP
            cp.sideCPs.push({
              cp: integratedCP.cpLocateStr,
              launchPoint: this.node.path,
              syncPoints: []
            });
          } else {
            // 移除匹配的sideCP
            const sideCPIndex = cp.sideCPs.findIndex(s =>
              s.launchPoint === this.node.path && s.cp === integratedCP.cpLocateStr);
            if (sideCPIndex !== -1) {
              cp.sideCPs.splice(sideCPIndex, 1);
            }
          }
        } else if (isAdd) {
          cp.sideCPs = [{
            cp: integratedCP.cpLocateStr,
            launchPoint: this.node.path,
            syncPoints: []
          }];
        }
        break;

      case IntegratedCPType.SideCPSyncPoint:
        // 这个情况比较复杂，需要找到对应的sideCP，然后更新其syncPoints
        // 这里只提供简化实现
        break;

      case IntegratedCPType.FrameworkMountPoint:
        // 更新frameworks的mountPoints
        if (cp.frameworks && cp.frameworks.length > 0) {
          if (isAdd) {
            // 添加mountPoint到第一个framework
            if (!cp.frameworks[0].mountPoints) {
              cp.frameworks[0].mountPoints = [];
            }
            cp.frameworks[0].mountPoints.push({
              node: this.node.path,
              cp: integratedCP.cpLocateStr
            });
          } else {
            // 移除匹配的mountPoint
            for (const framework of cp.frameworks) {
              if (framework.mountPoints) {
                const mpIndex = framework.mountPoints.findIndex(mp =>
                  mp.node === this.node.path && mp.cp === integratedCP.cpLocateStr);
                if (mpIndex !== -1) {
                  framework.mountPoints.splice(mpIndex, 1);
                  break;
                }
              }
            }
          }
        } else if (isAdd) {
          cp.frameworks = [{
            name: "default",
            mountPoints: [{
              node: this.node.path,
              cp: integratedCP.cpLocateStr
            }]
          }];
        }
        break;
    }
  }
}

export const IntegratedCPIconMap: Record<IntegratedCPType, string> = {
  [IntegratedCPType.Action]: 'ⓐ',
  [IntegratedCPType.Hook]: 'ⓗ',
  [IntegratedCPType.SideCPLaunchPoint]: 'ⓛ',
  [IntegratedCPType.SideCPSyncPoint]: 'ⓢ',
  [IntegratedCPType.FrameworkMountPoint]: 'ⓕ'
}
