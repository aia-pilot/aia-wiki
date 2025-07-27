import {type EaogFramework} from "./eaog-framework";
import type {CP, EaogNode, Hook, SideCP, IntegrationType} from "./types.d";
import {EditableEaogNode} from "#/views/cp/models/editable-eaog-node";
import {CPHistory} from "./cp-history";
// @ts-ignore
import {smartCloneDeep} from "../../../../../../../aia-se-comp/src/util/smart-clone-deep.js";
import {EditableIntegrationManager} from "./editable-integration-manager";
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
  launchNode?: EditableEaogNode; // 启动CP的节点，即当前编辑的节点
  integrationType: IntegrationType; // 集成点类型，默认为 'action'

  // Transient properties
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
  constructor(eaog: EaogNode, hooks: Hook[] = [], sideCPs: SideCP[] = [], frameworks: EaogFramework[] = [], filePath: string | undefined, launchNode: EditableEaogNode | undefined, integrationType: IntegrationType) {
    this.hooks = hooks;
    this.sideCPs = sideCPs;
    this.frameworks = frameworks;
    this.filePath = filePath;
    this.launchNode = launchNode;
    this.integrationType = integrationType;
    this.eaog = eaog instanceof EditableEaogNode ? eaog : new EditableEaogNode(eaog, undefined, this); // 确保eaog是EditableEaogNode实例

    EditableIntegrationManager.prepareIntegrationsForEaog(this, launchNode, integrationType, null); // 准备集成点
  }

  /**
   * 将CP实例转换为JSON对象
   * @returns CP的JSON表示
   * TODO: 移除或改进
   */
  toJSON(): CP {
    return {
      ...omit(this, ['parentIpath', 'history', 'eaog']),
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
 * @param integration
 */
export async function createEditableCP(cp: CP, filePath?: string, integration?: {type: IntegrationType, node: EditableEaogNode}): Promise<EditableCP> {
  const {currentNode} = await import('./cp-editor-state'); // 动态导入，避免循环依赖
  const editableCP = new EditableCP(cp.eaog, cp.hooks, cp.sideCPs, cp.frameworks, filePath, integration?.node || currentNode.value, integration?.type ||  'action');
  editableCP.history = new CPHistory(editableCP.cloneDeep());
  return editableCP;

  // const parentIpath = parentCP ? parentCP.integrationManager!.getIntegrationPath(currentNode, integrationType) : undefined;
  // const editableCP = new EditableCP(cp.eaog, hooks, sideCPs, frameworks, filePath || cp.filePath, parentCP?.integrationManager, parentIpath);
  // editableCP.history = new CPHistory(editableCP.cloneDeep());
  // return editableCP;
}
