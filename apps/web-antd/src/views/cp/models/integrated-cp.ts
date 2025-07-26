// @ts-nocheck
import type {CP, Hook, SideCP} from './types.d';
import type {EditableEaogNode} from './editable-eaog-node';
import {EditableIntegrationManager} from "#/views/cp/models/editable-integration-manager";
import type {IntegrationType} from './types.d';
import type {EditableCP} from "#/views/cp/models/editable-cp";
import {findNodeByBriefPath} from "../../../../../../../aia-eaog/src/tree-utils";

/**
 * 集成CP的展示方式类型
 */
export type ShowAsType = 'before' | 'after' | 'replace' | 'parallel';

/**
 * 集成CP类
 */
export class IntegratedCP {
  // 业务属性
  node: EditableEaogNode;           // 对应的节点，将在节点的UI界面 Node tailbar，提供操作入口
  launchHook: Hook;     // 集成CP的启动节点，通常等于node；type为'sync'时，是对应sideCP的launch节点
  sideCP?: SideCP;                // 对应的SideCP，如果有的话
  type: IntegrationType;           // 集成CP的类型

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
   * @param launchHook 集成CP的启动Hook，通常为undefined；type为'sync'时，是对应sideCP的launch hook
   * @param sideCP 对应的SideCP
   */
  constructor(node: EditableEaogNode, type: IntegrationType, cpLocateStr: string, showAt: ShowAsType, launchHook?: Hook, sideCP?: SideCP) {
    this.node = node;
    this.type = type;
    this.cpLocateStr = cpLocateStr;
    this.showAt = showAt;
    this.launchHook = launchHook; // 如果是'sync'类型，则使用对应的sideCP的launch节点，否则使用当前节点
    this.sideCP = sideCP;
    this.isShown = false
  }

  get integrationType(): IntegrationType {
    return this.type === 'sync' ? 'launch' : this.type; // 'sync'类型的集成CP实际上是一个sideCP的launch点
  }

  get integrationNode(): EditableEaogNode {
    return this.launchHook ? findNodeByBriefPath(this.node.root, this.launchHook.path) : this.node; // 如果有launchHook，则使用它，否则使用当前节点
  }

  /**
   * 在Editor中打开集成CP
   */
  async open() {
    const {loadCpFromCpStr} = await import('#/views/cp/models/cp-loader')
    const {createEditableCP} = await import('#/views/cp/models/editable-cp');
    const {parallelCP} = await import('#/views/cp/models/cp-editor-state');
    let {cp, filePath} = await loadCpFromCpStr(this.cpLocateStr);
    cp = await createEditableCP(cp, filePath, {type: this.integrationType, node: this.integrationNode});
    cp.integratedCP = this; /** 关联当前集成CP到CP，以便UI取值 {@link eaog-node.vue} TODO: 有缺陷，始终挂在CP上？ */
    this.showAt === 'replace' ? this.node.integratedCPReplaceNode = cp.eaog
      : this.showAt === 'before' ? this.node.integratedCPBeforeNode = cp.eaog
        : this.showAt === 'after' ? this.node.integratedCPAfterNode = cp.eaog
          : this.showAt === 'parallel' ? parallelCP.value = {cp, sideCP: (this.type === 'launch' ? this : this.launchHook).sideCP} // 并行CP需要同时保存sideCP信息
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
  private node: EditableEaogNode;

  /**
   * 构造函数，分析并收集节点对应的所有集成CP
   * @param node 节点
   */
  constructor(node: EditableEaogNode) {
    this.node = node;
  }

  get integrationManager() {
    return this.node.root.integrationManager as EditableIntegrationManager // 懒加载，确保 integrationManager 已经初始化
  }

  _integratedCPs: IntegratedCP[] | null = null; // 集成CP列表
  get integratedCPs(): IntegratedCP[] {
    if (this._integratedCPs === null) {
      const integrations = this.integrationManager.getIntegrations(this.node) || [];
      this._integratedCPs = integrations
        .filter(({cpLocateStr}) => !!cpLocateStr) // 过滤掉没有CP定位字符串的集成点
        .map(({type, block, hook, cpLocateStr, launchHook, sideCP}) => {
          const showAt = type === 'launch' || type === 'sync' ? 'parallel' : // launch、sync 是Side CP，总是并行执行
            type === 'action' || type === 'mount' ? 'replace' : // mount 是Framework CP，总是替换当前节点、action
              hook; // type === 'hook';

          return new IntegratedCP(this.node, type as IntegrationType, cpLocateStr, showAt, launchHook, sideCP);
        })
    }
    return this._integratedCPs; // 懒加载
  }

  /**
   * 判断是否包含指定类型的集成CP
   * @param type 集成CP类型
   */
  has(type?: IntegrationType): boolean {
    return type ? this.integratedCPs.some(cp => cp.type === type) : this.integratedCPs.length > 0;
  }

  get(type: IntegrationType): IntegratedCP | undefined {
    return this.integratedCPs.find(cp => cp.type === type);
  }


  /**
   * 获取集成CP的数量
   * @param type 集成CP类型（可选）
   */
  count(type?: IntegrationType): number {
    return type ? this.integratedCPs.filter(cp => cp.type === type).length : this.integratedCPs.length;
  }

  /**
   * 根据类型获取集成CP列表
   * @param type ���成CP类型
   */
  getCPsByType(type: IntegrationType): IntegratedCP[] {
    return this.integratedCPs.filter(cp => cp.type === type);
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
      case 'action':
        // 不能通过此方法更新节点的action属性，action属性通过直接修改节点对象来更新。
        throw new Error("Cannot update Action via IntegratedCPManager. Use node.action directly.");

      case 'hook':
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

      case 'launch':
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

      case 'sync':
        // 这个情况比较复杂，需要找到对应的sideCP，然后���新其syncPoints
        // 这里只提供简化实现
        break;

      case 'mount':
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

export const IntegratedCPIconMap: Record<IntegrationType, string> = {
  'action': 'ⓐ',
  'hook': 'ⓗ',
  'launch': 'ⓛ',
  'sync': 'ⓢ',
  'mount': 'ⓕ'
}
