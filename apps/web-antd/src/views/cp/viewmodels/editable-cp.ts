import {type EaogFramework} from "../models/eaog-framework";
import type {CP, EaogNode, Hook} from "../models/types";
import {CPHistory} from "./cp-history";
// @ts-ignore
import {smartCloneDeep} from "../../../../../../../aia-se-comp/src/util/smart-clone-deep.js";
import {EditableIntegrationManager, type Integration} from "../models/editable-integration-manager";
import {omit} from "lodash-es";
import {EditableSideCP} from "#/views/cp/viewmodels/editable-side-cp";
import {getCpLocateStrFromFilePath} from "#/views/cp/api/cp-loader";

import Debug from 'debug';
import {EditableEaogNode} from "#/views/cp/models/editable-eaog-node";
const debug = Debug("aia:cp:editable-cp");

/**
 * CP类 - 控制点实现
 */
export class EditableCP implements CP {
  id: string = crypto.randomUUID(); // 唯一标识符，使用UUID生成
  eaog: EaogNode;
  hooks: Hook[];
  sideCPs?: EditableSideCP[]; // 本CP将要加载的侧边CP列表，在createEditableCP中初始化
  frameworks: EaogFramework[];
  filePath?: string; // 可选的文件路径，用于本地存储
  // locateStr?: string; /** cpLocateStr {@link convertCpLocateStrToRelativePath} CP加载字符串，表示CP所在的路径 TODO: modulePath? */
  integrateFrom?: Integration; // 从何集成而来，被哪个CP集成进来
  integrateTo?: Integration[]; // 将集成到哪里去，进一步集成了哪些CP
  // Transient properties
  history?: CPHistory;

  /**
   * 创建一个新的CP实例
   * @param eaog - CP的EAOG数据
   * @param hooks - CP的Hook列表（可选）
   * @param frameworks - CP使用的EAOG Framework列表（可选）
   * @param filePath - 可选的文件路径，用于本地存储
   * @param integration - 集成信息，可选，当CP为集成加载时有效
   */
  constructor(eaog: EaogNode, hooks: Hook[] = [], frameworks: EaogFramework[] = [], filePath: string | undefined, integration?: Integration) {
    this.hooks = hooks;
    this.frameworks = frameworks;
    this.filePath = filePath;
    this.integrateFrom = integration
    this.eaog = eaog instanceof EditableEaogNode ? eaog : new EditableEaogNode(eaog, this); // 确保eaog是EditableEaogNode实例
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
      this.frameworks?.map(framework => framework.cloneDeep ? framework.cloneDeep() : smartCloneDeep(framework)),
      this.filePath,
    );
    clone.sideCPs = this.sideCPs!.map(s => s.cloneDeep()); // 确保sideCPs是EditableSideCP实例
    clone.integrateFrom = this.integrateFrom
    clone.integrateTo = this.integrateTo
    return clone;
  }
}

const cpCache = new Map<string, EditableCP>(); // 缓存CP实例，避免重复创建

/**
 * @param cp
 * @param filePath
 * @param integration
 */
export async function createEditableCP(cp: CP, filePath?: string, integration?: Integration): Promise<EditableCP> {
  // const {currentNode} = await import('./cp-editor-state'); // 动态导入，避免循环依赖

  const isTopCP = !integration// 顶层CP没有集成
  if (isTopCP && cpCache.has(filePath!)) {
    debug(`从缓存中获取CP实例，filePath: ${filePath}`);
    return cpCache.get(filePath!)!; // 从缓存中获取CP实例
  }

  const editableCP = new EditableCP(cp.eaog, cp.hooks, cp.frameworks, filePath, integration);
  cpCache.set(filePath!, editableCP); // 缓存CP实例

  editableCP.sideCPs = (cp.sideCPs || []).map(s => new EditableSideCP(s, editableCP)); // 确保sideCPs是EditableSideCP实例, 注意：不能在eaog构造前，构造 EditableSideCP，否则找不到launchPoint、syncPoints
  editableCP.integrateTo = EditableIntegrationManager.prepareIntegrationsForEaog(editableCP, integration?.integrator, integration?.type, null) as unknown as Integration[]; // 在eaog root上添加integrationManager属性，并准备集成点
  editableCP.history = new CPHistory(editableCP.cloneDeep());

  (editableCP.eaog.integrationManager as EditableIntegrationManager).load(editableCP)

  return editableCP;
}
