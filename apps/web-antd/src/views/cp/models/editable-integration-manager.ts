import type {IntegrationPoint, IntegrationType, EaogNode, Hook, SideCP} from './types.d';
// @ts-ignore
import {IntegrationPointSchema, z} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog.zod.js";
import {CPIntegrationManager} from "../../../../../../../aia-se-comp/src/eaog/cp-integration-manager.js";
import type {EditableEaogNodeVMType} from "#/views/cp/models/editable-eaog-node-vm";
import {findNodeByBriefPath} from "../../../../../../../aia-eaog/src/tree-utils";

/**
 * 可编辑的集成管理器，继承自CPIntegrationManager
 * 提供针对节点的集成点操作方法
 */
export class EditableIntegrationManager extends CPIntegrationManager {

  override loadIntegrations(integrations: IntegrationPoint[], parentIpath?: string): void {
    integrations = integrations.map(itg => new Integration(itg)); // 生成 Integration 实例
    super.loadIntegrations(integrations, parentIpath);
  }

  /**
   * 检查节点是否存在指定类型的集成点
   * @param node 要检查的节点
   * @param type 可选的集成点类型
   * @returns 是否存在集成点
   */
  has(node: EaogNode, type?: IntegrationType): boolean {
    if (!node.ipath) {
      return false;
    }
    return this.integrations.some(integration => integration.ipath === node.ipath && (!type || integration.type === type));
  }

  /**
   * 获取节点上的集成点
   * @param node 要获取集成点的节点
   * @param type 可选的集成点类型
   * @returns 符合条件的集成点数组
   */
  get(node: EaogNode, type?: IntegrationType): IntegrationPoint[] {
    if (!node.ipath) {
      return [];
    }
    return this.integrations.filter(integration => integration.ipath === node.ipath && (!type || integration.type === type));
  }

  /**
   * 添加集成点
   * @param integrationPoint 要添加的集成点
   * @returns 添加后的集成点
   */
  add(integrationPoint: IntegrationPoint): IntegrationPoint {
    try {
      // 使用zod验证集成点格式
      const validatedPoint = IntegrationPointSchema.parse(integrationPoint);

      // 避免重复添加
      const existingIndex = this.integrations.findIndex(i =>
        i.ipath === integrationPoint.ipath && i.type === integrationPoint.type
      );

      if (existingIndex >= 0) {
        this.integrations[existingIndex] = validatedPoint;
      } else {
        this.integrations.push(validatedPoint);
      }
      return validatedPoint;
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error(`集成点验证失败: ${(error as z.ZodError).errors.map((e: {
          message: string
        }) => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * 移除集成点
   * @param integrationPoint 要移除的集成点
   * @returns 是否成功移除
   */
  remove(integrationPoint: IntegrationPoint): boolean {
    const initialLength = this.integrations.length;

    this.integrations = this.integrations.filter(integration => {
      // 通过ipath和type确定唯一的集成点
      return !(integration.ipath === integrationPoint.ipath &&
        integration.type === integrationPoint.type &&
        integration.id === integrationPoint.id);
    });

    return initialLength > this.integrations.length;
  }

  /**
   * 根据节点和类型移除集成点
   * @param node 相关节点
   * @param type 可选的集成点类型
   * @returns 移除的集成点数量
   */
  removeByNode(node: EaogNode, type?: IntegrationType): number {
    if (!node.ipath) {
      return 0;
    }

    const initialLength = this.integrations.length;

    if (type) {
      this.integrations = this.integrations.filter(integration =>
        !(integration.ipath?.startsWith(node.ipath as string) && integration.type === type)
      );
    } else {
      this.integrations = this.integrations.filter(integration =>
        !integration.ipath?.startsWith(node.ipath as string)
      );
    }

    return initialLength - this.integrations.length;
  }

  async open(integrator: EditableEaogNodeVMType, integrationType: IntegrationType, index = 0) {
    const integration = this.get(integrator, integrationType)[index]
    if (integration) {
      await integration.open(integrator);
    } else {
      throw new Error(`集成点不存在: ${integrator.ipath}，集成类型： (${integrationType})`);
    }
  }

  async close(integratee: EditableEaogNodeVMType, integrationType: IntegrationType, index = 0) {
    const integration = this.findIntegrationByIntegrateeNode(integratee, index);
    if (integration) {
      integration.close();
    } else {
      throw new Error(`集成点不存在，被集成的eaog ${integratee.name}，集成类型 (${integrationType})`);
    }
  }

  async toggle(integrator: EditableEaogNodeVMType, integrationType: IntegrationType, index = 0) {
    const integration = this.get(integrator, integrationType)[index];
    if (integration) {
      if (integration.integratee) {
        await integration.close();
      } else {
        await integration.open(integrator);
      }
    } else {
      throw new Error(`集成点不存在: ${integrator.ipath}，集成类型： (${integrationType})`);
    }
  }

  findIntegrationByIntegrateeNode(node: EditableEaogNodeVMType, index): Integration | undefined {
    return this.integrations.filter(integration => integration.integratee?.eaog === node)[index];
  }

  isIntegratedNode(node: EditableEaogNodeVMType): boolean {
    return this.integrations.some(integration => integration.isIntegratedNode(node));
  }

  getIntegratedNodes(node: EditableEaogNodeVMType, showAt: ShowAtType): EditableEaogNodeVMType[] {
    return this.integrations
      .filter(integration => integration.showAt === showAt && integration.integrator === node && integration.integratee)
      .map(integration => integration.integratee!.eaog as EditableEaogNodeVMType);
  }

  getOriginalNode(integratedNode: EditableEaogNodeVMType): EditableEaogNodeVMType | undefined {
    return this.integrations.find(integration => integration.isIntegratedNode(integratedNode))?.integrator;
  }
}

export enum ShowAtType {
  Before = 'before',          // integrator前
  After = 'after',           // integrator后
  Replace = 'replace',        // 替换integrator
  Parallel = 'parallel'        // 并行集成，独立显示在 parallel pane 中
}

class Integration implements IntegrationPoint {
  type!: IntegrationType;
  name!: string;
  block!: boolean;
  path!: string;
  ipath?: string;
  id?: string;
  sideCP?: SideCP; // 副CP定义
  hook?: 'before' | 'after'; // 集成点的Hook类型
  cpLocateStr?: string;
  launchHook?: Hook; // 启动集成的Hook

  integrator?: EditableEaogNodeVMType; // 发起集成的节点
  integratee?: EditableCP; // 被集成的CP
  showAt?: ShowAtType; // 集成点显示位置

  constructor(integrationPoint: IntegrationPoint) {
    Object.assign(this, integrationPoint);
    this.showAt = this.type === 'launch' || this.type === 'sync' ? ShowAtType.Parallel : // launch、sync 是Side CP，总是并行执行
      this.type === 'action' || this.type === 'mount' ? ShowAtType.Replace : // mount 是Framework CP，总是替换当前节点、action
        this.hook === 'before' ? ShowAtType.Before :  // before Hook 集成点在发起节点前
          this.hook === 'after' ? ShowAtType.After : // after Hook 集成点在发起节点后
            undefined; // 其他情况未定义
  }

  get isShowing() {
    return this.integratee !== undefined; // 如果被集成的CP存在，则表示集成点已显示
  }

  get parallelShowingCPAndSideCP() {
    return this.isShowing && this.showAt === ShowAtType.Parallel ?
      {cp: this.integratee, sideCP: this.launchHook ? this.launchHook.sideCP : this.sideCP}
      : undefined;
  }

  async open(integrator: EditableEaogNodeVMType) {
    this.integrator = integrator; // 设置集成点的发起节点
    const {loadCpFromCpStr} = await import('#/views/cp/services/cp-loader')
    const {createEditableCP} = await import('#/views/cp/viewmodels/editable-cp');
    const {parallelCP} = await import('#/views/cp/viewmodels/cp-editor-state');
    let {cp, filePath} = await loadCpFromCpStr(this.cpLocateStr!);
    const integrationNode = this.launchHook ? findNodeByBriefPath(integrator.root, this.launchHook.path) : integrator; // 如果有launchHook，则使用它，否则使用当前节点
    this.integratee = await createEditableCP(cp, filePath, {type: this.type, node: integrationNode});
    // if (this.showAt === ShowAtType.Parallel) {
    //   parallelCP.value = {cp: this.integratee, sideCP: this.launchHook ? this.launchHook.sideCP : this.sideCP}; // 将集成的CP设置为并行CP
    // } else {
    //   // DONOTHING; 通过响应式系统（replaceCPRootNode、beforeCPRootNode、afterCPRootNode）自动更新视图
    // }
  }

  async close() {
    this.integrator = undefined; // 清除发起节点
    this.integratee = undefined; // 清除被集成的CP
    if (this.showAt === ShowAtType.Parallel) {
      const {parallelCP} = await import('#/views/cp/viewmodels/cp-editor-state');
      parallelCP.value = undefined; // 清除并行CP
    }
  }


  get replaceCPRootNode() {
    return this.showAt === 'replace' ? this.integratee.eaog : undefined;
  }

  get beforeCPRootNode() {
    return this.showAt === 'before' ? this.integratee.eaog : undefined;
  }

  get afterCPRootNode() {
    return this.showAt === 'after' ? this.integratee.eaog : undefined;
  }

  isIntegratedNode(node: EditableEaogNodeVMType): boolean {
    return this.showAt === ShowAtType.Replace && this.integratee?.eaog === node
  }
}

