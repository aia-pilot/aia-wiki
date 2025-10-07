import {CPHistory} from "./cp-history";
// @ts-ignore
import {smartCloneDeep} from "../../../../../../../aia-se-comp/src/util/smart-clone-deep.js";
import {prepareIntegrationsForEaog} from "../../../../../../../aia-se-comp/src/eaog/cp-integration-manager.js";
import {EditableIntegrationManager, type Integration} from "../models/editable-integration-manager";
import {omit} from "lodash-es";
// import {EditableSideCP} from "#/views/cp/viewmodels/editable-side-cp";
import {getCpLocateStrFromFilePath} from "#/views/cp/api/cp-loader";

import Debug from 'debug';
import {EditableEaogNode} from "#/views/cp/models/editable-eaog-node";
import {createBrowserCPM, CPEditSession} from "aia-cpm/cpm";
import {EJ} from "aia-cpm/types";

import {IntegrationManager} from "aia-ect-integration";
import {CPRefObj} from "aia-cpm/src/cpm";

// @ts-ignore
const debug = Debug("aia:cp:editable-cp");

/**
 * CP类 - 控制点实现
 */
export class EditableCP {
  id: string = crypto.randomUUID(); // 唯一标识符，使用UUID生成
  ect: EJ;
  hooks: EJ[];
  sides: EJ[]; // 本CP将要加载的侧边CP列表，在createEditableCP中初始化
  context: EJ;

  // Transient properties
  editSession: CPEditSession; // 当前CP所属的编辑会话
  integrationManager: IntegrationManager; // 集成管理器实例
  history: CPHistory;

  /**
   * 创建一个新的CP实例
   */
  constructor(cp: {ect: EJ, hooks: EJ[], sides: EJ[], context: EJ},  editSession: CPEditSession, integrationManager: IntegrationManager) {
    this.ect = ect;
    this.hooks = hooks;
    this.sides = sides;
    this.context = context;
    this.editSession = editSession;
    this.integrationManager = integrationManager;
    this.history = new CPHistory(this.cloneDeep());
  }

  /**
   * 将CP实例转换为JSON对象
   * @returns CP的JSON表示
   * TODO: 移除或改进
   */
  toJSON(): CP {
    return {
      ...omit(this, ['parentIpath', 'history', 'eaog', 'integrateFrom', 'integrateTo']),
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
    const clone = new EditableCP(
      this.eaog.cloneDeep(),
      this.hooks?.map(h => smartCloneDeep(h)),
      this.filePath,
    );
    clone.sideCPs = this.sideCPs!.map(s => s.cloneDeep()); // 确保sideCPs是EditableSideCP实例
    clone.integrateFrom = this.integrateFrom
    clone.integrateTo = this.integrateTo
    return clone;
  }
}


/**
 * @param workspace - 工作区路径
 * @param corePath - 核心CP文件路径
 * @param depth - 集成加载深度
 */
export async function createEditableCP(workspace: FileSystemDirectoryHandle, corePath: string, depth = 10): Promise<EditableCP> {
  // const {currentNode} = await import('./cp-editor-state'); // 动态导入，避免循环依赖

  // 注意：不能在集成时进行，因为集成时，无法对应到
  async function integrate(obj: CPRefObj | null, session: CPEditSession) {
    const cp = session.aggregate;
    await itgMgr.integrateCP(cp.ect, cp, cp.ect.$.integrationPoint);
    // TODO：遍历ECT树，然后执行 integrateNode
    // await itgMgr.integrateNode(node, 'before', loadAndExecuteCP, exec, ctx);
  }

  const cpm = createBrowserCPM(workspace);
  const root = '.'
  const editSession = await cpm.open({root, corePath: 'src/level1.cp.js', integratedLoad: {enabled: true, depth, onIntegratedCP: integrate}});
  const itgMgr = new IntegrationManager();
  return new EditableCP(editSession.aggregate, editSession, itgMgr);
}


/**
 * @param cp
 * @param filePath
 * @param integration
 */
export async function _createEditableCP(cp: CP, filePath?: string, integration?: Integration): Promise<EditableCP> {
  // const {currentNode} = await import('./cp-editor-state'); // 动态导入，避免循环依赖

  const editableCP = new EditableCP(cp.eaog, cp.hooks, cp.frameworks, filePath, integration);

  editableCP.sideCPs = (cp.sideCPs || []).map(s => new EditableSideCP(s, editableCP)); // 确保sideCPs是EditableSideCP实例, 注意：不能在eaog构造前，构造 EditableSideCP，否则找不到launchPoint、syncPoints
  editableCP.integrateTo = prepareIntegrationsForEaog(editableCP, integration?.integrator, integration?.type, EditableIntegrationManager, null) as unknown as Integration[]; // 在eaog root上添加integrationManager属性，并准备集成点
  editableCP.history = new CPHistory(editableCP.cloneDeep());

  (editableCP.eaog.integrationManager as EditableIntegrationManager).load(editableCP)

  return editableCP;
}
