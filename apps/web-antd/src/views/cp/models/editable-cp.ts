import {type EaogFramework} from "./eaog-framework";
import type {CP, EaogNode, Hook, SideCP, IntegrationType} from "./types.d";
import {EditableEaogNode} from "#/views/cp/models/editable-eaog-node";
import {CPHistory} from "./cp-history";
// @ts-ignore
import {smartCloneDeep} from "../../../../../../../aia-se-comp/src/util/smart-clone-deep.js";
import {EditableIntegrationManager} from "./editable-integration-manager";
import {integrateSideCpsAsHooks} from "../../../../../../../aia-se-comp/src/eaog/side-cp-manager";
import {integrateEaogHooks} from "../../../../../../../aia-se-comp/src/eaog/hook-manager";
import {omit} from "lodash-es";

/**
 * CP类 - 控制点实现
 */
export class EditableCP implements CP {
  eaog: EaogNode;
  hooks: Hook[];
  sideCPs: SideCP[];
  frameworks: EaogFramework[];
  filePath?: string; // 可选的文件路径，用于本地存储
  integrationManager?: EditableIntegrationManager | undefined; // 集成管理器，处理集成点的添加和查询
  launchNode?: EditableEaogNode; // 启动CP的节点，即当前编辑的节点
  integrationType: IntegrationType; // 集成点类型，默认为'action'

  // Transient properties
  parentIpath?: string; // 父CP的集成路径
  history?: CPHistory;

  /**
   * 创建一个新的CP实例
   * @param eaog - CP的EAOG数据
   * @param hooks - CP的Hook列表（可选）
   * @param sideCPs - CP的侧边CP列表（可选）
   * @param frameworks - CP使用的EAOG Framework列表（可选）
   * @param filePath - 可选的文件路径，用于本地存储
   * @param launchNode - 启动CP的节点，即当前编辑的节点（可选）
   * @param integrationType
   */
  constructor(eaog: EaogNode, hooks: Hook[] = [], sideCPs: SideCP[] = [], frameworks: EaogFramework[] = [], filePath: string | undefined, launchNode: EditableEaogNode | undefined, integrationType: IntegrationType = 'action') {
    this.hooks = hooks;
    this.sideCPs = sideCPs;
    this.frameworks = frameworks;
    this.filePath = filePath;
    this.launchNode = launchNode;
    this.integrationType = integrationType;
    this.eaog = eaog instanceof EditableEaogNode ? eaog : new EditableEaogNode(eaog, null, this); // 确保eaog是EditableEaogNode实例

    const parentCP = launchNode?.cp as EditableCP | undefined; // 获取当前节点的父CP
    this.integrationManager = parentCP?.integrationManager || new EditableIntegrationManager();
    this.parentIpath = parentCP ? parentCP.integrationManager!.getIntegrationPath(launchNode, integrationType) : undefined;

    this.integrationManager.addIpathForEaog(this.eaog, this.parentIpath || null);
    const sideCpHooks = integrateSideCpsAsHooks(this.eaog, launchNode, this.sideCPs, null); // 将cp定义的sideCPs应用到eaog上，以便及时启动、同步执行side CPs。
    integrateEaogHooks(this.eaog, [...(this.hooks || []), ...sideCpHooks], launchNode?.ipath);
  }

  /**
   * 将CP实例转换为JSON对象
   * @returns CP的JSON表示
   * TODO: 移除或改进
   */
  toJSON(): CP {
    return {
      ...omit(this, ['parentIpath', 'integrationManager', 'history', 'eaog']),
      eaog: this.eaog.toJSON()
    };
  }

  /**
   * 添加当前状态到历史记录
   */
  addToHistory(): void {
    if (this.history) {
      this.history.addToHistory(this);
    }
  }

  cloneDeep(): EditableCP {
    return new EditableCP(
      this.eaog.cloneDeep(),
      this.hooks?.map(h => smartCloneDeep(h)),
      this.sideCPs?.map(s => smartCloneDeep(s)),
      this.frameworks?.map(framework => framework.cloneDeep ? framework.cloneDeep() : smartCloneDeep(framework)),
      this.filePath,
      this.launchNode,
      this.integrationType
    );
  }
}

/**
 * @param cp
 * @param filePath
 * @param parentCP - 父CP，其未匹配到的hooks, sideCPs, frameworks等将被继承到新创建的CP中，进一步匹配, TODO：移除，可以从currentNode.cp获取
 * @param integrationType
 */
export async function createEditableCP(cp: CP, filePath?: string, parentCP?: EditableCP, integrationType: IntegrationType = 'action'): Promise<EditableCP> {
  const {currentNode} = await import('./cp-editor-state'); // 动态导入，避免循环依赖
  const editableCP = new EditableCP(cp.eaog, cp.hooks, cp.sideCPs, cp.frameworks, filePath || cp.filePath, currentNode.value, integrationType);
  editableCP.history = new CPHistory(editableCP.cloneDeep());
  return editableCP;

  // const parentIpath = parentCP ? parentCP.integrationManager!.getIntegrationPath(currentNode, integrationType) : undefined;
  // const editableCP = new EditableCP(cp.eaog, hooks, sideCPs, frameworks, filePath || cp.filePath, parentCP?.integrationManager, parentIpath);
  // editableCP.history = new CPHistory(editableCP.cloneDeep());
  // return editableCP;
}
