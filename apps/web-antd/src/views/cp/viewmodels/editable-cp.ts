import {type EaogFramework} from "../models/eaog-framework";
import type {CP, EaogNode, Hook, SideCP, IntegrationType} from "../models/types";
import {CPHistory} from "./cp-history";
// @ts-ignore
import {smartCloneDeep} from "../../../../../../../aia-se-comp/src/util/smart-clone-deep.js";
import {EditableIntegrationManager, type Integration} from "../models/editable-integration-manager";
import {omit} from "lodash-es";
import {
  createEditableEaogNodeVM,
  EditableEaogNodeVM,
  type EditableEaogNodeVMType
} from "#/views/cp/viewmodels/editable-eaog-node-vm";
import {EditableSideCP} from "#/views/cp/viewmodels/editable-side-cp";

import Debug from 'debug';
import {getCpLocateStrFromFilePath} from "#/views/cp/services/cp-loader";
const debug = Debug("aia:cp:editable-cp");

/**
 * CP类 - 控制点实现
 */
export class EditableCP implements CP {
  eaog: EaogNode;
  hooks: Hook[];
  sideCPs: SideCP[]; // 本CP将要加载的侧边CP列表
  frameworks: EaogFramework[];
  filePath?: string; // 可选的文件路径，用于本地存储
  // locateStr?: string; /** cpLocateStr {@link parseCpModuleLocateStr} CP加载字符串，表示CP所在的路径 TODO: modulePath? */
  integrateFrom?: Integration; // 从何集成而来
  integrateTo?: EditableIntegrationManager; // 集成到哪个CP上，集成点管理器
  // Transient properties
  history?: CPHistory;

  /**
   * 创建一个新的CP实例
   * @param eaog - CP的EAOG数据
   * @param hooks - CP的Hook列表（可选）
   * @param sideCPs - CP的侧边CP列表（可选）
   * @param frameworks - CP使用的EAOG Framework列表（可选）
   * @param filePath - 可选的文件路径，用于本地存储
   * @param integration - 集成信息，可选，当CP为集成加载时有效
   */
  constructor(eaog: EaogNode, hooks: Hook[] = [], sideCPs: SideCP[] = [], frameworks: EaogFramework[] = [], filePath: string | undefined, integration?: Integration) {
    this.hooks = hooks;
    this.sideCPs = sideCPs
    this.frameworks = frameworks;
    this.filePath = filePath;
    this.integrateFrom = integration
    // this.eaog = eaog instanceof EditableEaogNodeVMType ? eaog : new EditableEaogNodeVMType(eaog, undefined, this); // 确保eaog是EditableEaogNode实例
    this.eaog = eaog instanceof EditableEaogNodeVM ? eaog : createEditableEaogNodeVM(eaog, undefined, this); // 确保eaog是EditableEaogNode实例
  }

  get cpLocateStr(): string {
    return getCpLocateStrFromFilePath(this.filePath!); // 从文件路径获取CP定位字符串
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
      this.sideCPs?.map(s => s.cloneDeep()),
      this.frameworks?.map(framework => framework.cloneDeep ? framework.cloneDeep() : smartCloneDeep(framework)),
      this.filePath,
      this.integrateFrom
    );
  }
}

/**
 * @param cp
 * @param filePath
 * @param integration
 */
export async function createEditableCP(cp: CP, filePath?: string, integration?: Integration): Promise<EditableCP> {
  const {currentNode} = await import('./cp-editor-state'); // 动态导入，避免循环依赖
  const editableCP = new EditableCP(cp.eaog, cp.hooks, cp.sideCPs, cp.frameworks, filePath, integration);

  editableCP.sideCPs = editableCP.sideCPs.map(s => new EditableSideCP(s, editableCP)); // 确保sideCPs是EditableSideCP实例, 注意：不能在eaog构造前，构造 EditableSideCP，否则找不到launchPoint、syncPoints
  editableCP.integrateTo = EditableIntegrationManager.prepareIntegrationsForEaog(editableCP, integration?.integrator, integration?.type, null); // 在eaog root上添加integrationManager属性，并准备集成点
  editableCP.history = new CPHistory(editableCP.cloneDeep());

  (editableCP.eaog.integrationManager as EditableIntegrationManager).load(editableCP)

  return editableCP;
}
