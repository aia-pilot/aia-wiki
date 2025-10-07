import type {EaogNode, Hook, IntegrationPoint, IntegrationType, SideCP} from './types.d';
// @ts-ignore
import {IntegrationPointSchema, z} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog.zod.js";
// import {CPIntegrationManager} from "../../../../../../../aia-se-comp/src/eaog/cp-integration-manager.js";
import {findNodeByIpath, isNodeForIpath} from "eaog/ect";
import type {EditableEaogNode} from "#/views/cp/models/editable-eaog-node";
import type {EditableCP} from "#/views/cp/viewmodels/editable-cp";

import {type Reactive, reactive} from 'vue';

import Debug from 'debug';
import type {EditableSideCP} from "#/views/cp/viewmodels/editable-side-cp";

// @ts-ignore
const debug = Debug("aia:cp:editable-integration-manager");

/**
 * 可编辑的集成管理器，继承自CPIntegrationManager
 * 提供针对节点的集成点操作方法
 */
export class EditableIntegrationManager extends CPIntegrationManager {
  id: string = crypto.randomUUID(); // 唯一标识符，使用UUID生成

  override loadIntegrations(integrations: IntegrationPoint[], parentIpath?: string, eaog?: EditableEaogNode): Promise<Reactive<Integration>[]> {
    integrations = integrations.map(itg => createReactiveIntegration(itg, eaog)) as Integration[]; // 生成 Integration 实例
    return super.loadIntegrations(integrations, parentIpath, eaog);
  }

  /**
   * 检查节点是否存在指定类型的集成点
   * @param node 要检查的节点
   * @param type 可选的集成点类型
   * @param predicate 额外筛选器
   * @returns 是否存在集成点
   */
  has(node: EaogNode, type?: IntegrationType, predicate?: Function): boolean {
    return node.ipath && this.integrations.some(integration =>
      isNodeForIpath(node, integration.ipath) && (!type || integration.type === type) && (!predicate || predicate(integration))
    );
  }

  /**
   * 获取节点上的集成点
   * @param node 要获取集成点的节点
   * @param type 可选的集成点类型
   * @param predicate 额外筛选器函数
   * @returns 符合条件的集成点数组
   */
  get(node: EaogNode, type?: IntegrationType, predicate?: Function): Integration[] {
    if (!node.ipath) {
      return [];
    }
    return this.integrations.filter(integration =>
      isNodeForIpath(node, integration.ipath) && (!type || integration.type === type) && (!predicate || predicate(integration))
    );
  }

  /**
   * 加载未加载的集成点。
   * 注意：1）将递归加载集成点和延伸集成点；2）采用异步非阻塞加载，避免重复加载
   */
  load(cp: EditableCP, integrations?: Integration[]) {
    integrations ||= this.integrations || []
    const launchIntegrations = this.getIntegrationsOnCP(integrations, cp, (i: Integration) => i.isCPLaunchIntegration); // 过滤掉未找到集成发起点

    /* DO NOT await here, 避免阻塞 */
    // 1) 加载启动集成点
    launchIntegrations.length > 0 && Promise.all(launchIntegrations.map(integration => {
      return integration.loadAndOpen(cp.eaog).then(() => {
        // 2）加载同一CP其他非启动集成点
        // const sameIntegrateeIntegrations = this.integrations.filter(i => i !== integration && i.cpLocateStr === integration.cpLocateStr);
        const sameIntegrateeIntegrations = this.getIntegrationsOnCP(this.integrations, cp, (i: Integration) => !i.isCPLaunchIntegration && i.cpLocateStr === integration.cpLocateStr);
        sameIntegrateeIntegrations.forEach(sameIntegration => sameIntegration.loadAndOpen(cp.eaog, integration.integratee));

        // 3）加载延伸集成集成点（看新加载的CP，可否匹配其它集成点）
        this.load(integration.integratee!)
      });
    })).then(() => {



      // 4）加载不同CP的其他集成点 （此时，同一CP的集成点已经加载完成）
      // const otherIntegrations = this.getIntegrationsOnCP((integrations), cp, i => !i.isCPLaunchIntegration);
      // otherIntegrations.forEach(integration => integration.loadAndOpen(cp.eaog));
    })
  }

  private getIntegrationsOnCP(integrations: Integration[], cp: EditableCP, filter: Function): Integration[] {
    integrations = integrations.filter(i => i.status === 'pending' && (!filter || filter(i)))
    integrations.forEach(i => i.integrator = findNodeByIpath(cp.eaog, i.ipath))
    return integrations.filter(i => i.integrator);
  }

  async open(integrator: EditableEaogNode, integrationType: IntegrationType, index = 0) {
    const integration = this.get(integrator, integrationType)[index]
    if (integration) {
      await integration.loadAndOpen(integrator);
    } else {
      throw new Error(`集成点不存在: ${integrator.ipath}，集成类型： (${integrationType})`);
    }
  }

  async close(integratee: EditableEaogNode, integrationType: IntegrationType, index = 0) {
    const integration = this.findIntegrationByIntegrateeNode(integratee, index);
    if (integration) {
      integration.unloadAndClose();
    } else {
      throw new Error(`集成点不存在，被集成的eaog ${integratee.name}，集成类型 (${integrationType})`);
    }
  }

  async toggle(integrator: EditableEaogNode, integrationType: IntegrationType, index = 0) {
    const integration = this.get(integrator, integrationType)[index];
    if (integration) {
      if (integration.integratee) {
        await integration.unloadAndClose();
      } else {
        await integration.loadAndOpen(integrator);
      }
    } else {
      throw new Error(`集成点不存在: ${integrator.ipath}，集成类型： (${integrationType})`);
    }
  }

  findIntegrationByIntegrateeNode(node: EditableEaogNode, index: number): Integration | undefined {
    return this.integrations.filter(integration => integration.integratee?.eaog === node)[index];
  }

  isIntegratedNode(node: EditableEaogNode): boolean {
    return this.integrations.some(integration => integration.isIntegratedNode(node));
  }

  getIntegratedNodes(node: EditableEaogNode, showAt: ShowAtType): EditableEaogNode[] {
    return this.integrations
      .filter(integration => integration.showAt === showAt && integration.integrator === node && integration.integratee)
      .map(integration => integration.integratee!.eaog as EditableEaogNode);
  }

  getOriginalNode(integratedNode: EditableEaogNode): EditableEaogNode | undefined {
    return this.integrations.find(integration => integration.isIntegratedNode(integratedNode))?.integrator;
  }
}

export enum ShowAtType {
  Before = 'before',          // integrator前
  After = 'after',           // integrator后
  Replace = 'replace',        // 替换integrator
  Parallel = 'parallel'        // 并行集成，独立显示在 parallel pane 中
}

export class Integration implements IntegrationPoint {
  type!: IntegrationType;
  name!: string;
  block!: boolean;
  path!: string;
  ipath?: string;
  id: string = crypto.randomUUID(); // 唯一标识符，使用UUID生成
  sideCP?: SideCP; // 副CP定义
  hook?: 'before' | 'after'; // 集成点的Hook类型
  cpLocateStr?: string;
  launchHook?: Hook; // 启动集成的Hook

  status?: 'pending' | 'loading' | 'loaded' | 'closed' = 'pending'; // 集成点状态
  definedAt?: EditableCP; // 定义集成点的CP。非延伸集成时。
  integrator?: EditableEaogNode; // 发起集成的节点
  integratee?: EditableCP; // 被集成的CP
  showAt?: ShowAtType; // 集成点显示位置

  constructor(integrationPoint: IntegrationPoint, defineAt?: EditableCP) {
    Object.assign(this, integrationPoint);
    this.definedAt = defineAt;
    this.showAt = this.type === 'launch' || this.type === 'sync' ? ShowAtType.Parallel : // launch、sync 是Side CP，总是并行执行
      this.type === 'action' || this.type === 'mount' ? ShowAtType.Replace : // mount 是Framework CP，总是替换当前节点、action
        this.hook === 'before' ? ShowAtType.Before :  // before Hook 集成点在发起节点前
          this.hook === 'after' ? ShowAtType.After : // after Hook 集成点在发起节点后
            undefined; // 其他情况未定义
  }

  get isExtendIntegration() {
    return this.path.includes('//'); // 如果path包含双斜杠，说明指向的integrator不在this.definedAt的CP上，是延伸集成点。
  }

  get isCPIntegration() {
    return this.cpLocateStr !== undefined; // 如果cpLocateStr存在，则表示是CP集成点
  }

  get isCPLaunchIntegration() {
    return ['launch', 'action'].includes(this.type) && this.cpLocateStr !== undefined; // 如果cpLocateStr存在，且类型是launch或action，则表示是CP启动集成点
  }

  get isLoaded() {
    return this.integrator != null && this.integratee != null && this.status === 'loaded'; // 如果被集成的CP存在，则表示集成点已显示
  }

  /**
   * 在集成发起节点，打开集成点
   * @param integrator - 发起集成的节点
   * @param integratee - 被集成的CP（可选），未提供时，将按this.cpLocateStr加载。
   */
  async loadAndOpen(integrator?: EditableEaogNode, integratee?: EditableCP) {
    this.integrator ||= integrator;
    if (!this.integrator) {
      throw new Error(`集成点 ${this.name} (${this.type}) 的发起节点未指定或未找到`);
    }

    const {loadCp} = await import('#/views/cp/api/cp-loader')
    const {createEditableCP} = await import('#/views/cp/viewmodels/editable-cp');

    this.status = 'loading';
    if (!integratee) {
      let {cp, filePath} = await loadCp(this.cpLocateStr!);
      integratee = await createEditableCP(cp, filePath, this);
    }
    this.integratee = integratee;
    (this.sideCP as EditableSideCP | undefined)?.integrate(integrator!.root.cp!, integratee);
    this.status = 'loaded';
  }

  async unloadAndClose() {
    this.integrator = undefined;
    this.integratee = undefined;
    this.status = 'closed';
  }


  get replaceCPRootNode() {
    return this.showAt === 'replace' ? this.integratee?.eaog : undefined;
  }

  get beforeCPRootNode() {
    return this.showAt === 'before' ? this.integratee?.eaog : undefined;
  }

  get afterCPRootNode() {
    return this.showAt === 'after' ? this.integratee?.eaog : undefined;
  }

  isIntegratedNode(node: EditableEaogNode): boolean {
    return this.showAt === ShowAtType.Replace && this.integratee?.eaog === node
  }
}

function createReactiveIntegration(integrationPoint: IntegrationPoint, eaog?: EditableEaogNode): Reactive<Integration> {
  return reactive(new Integration(integrationPoint, eaog!.cp));
}
