import { type EaogFramework } from "./eaog-framework";
import type { EaogNode, Hook, SideCP, CP} from "./types.d";
import {EditableEaogNode} from "#/views/cp/models/editable-eaog-node";
import {CPHistory} from "./cp-history";
// @ts-ignore
import {smartCloneDeep} from "../../../../../../../aia-se-comp/src/util/smart-clone-deep.js";
/**
 * CP类 - 控制点实现
 */
export class EditableCP implements CP {
  eaog: EaogNode;
  hooks: Hook[];
  sideCPs: SideCP[];
  frameworks: EaogFramework[];
  filePath?: string; // 可选的文件路径，用于本地存储
  history?: CPHistory;

  /**
   * 创建一个新的CP实例
   * @param eaog - CP的EAOG数据
   * @param hooks - CP的Hook列表（可选）
   * @param sideCPs - CP的侧边CP列表（可选）
   * @param frameworks - CP使用的EAOG Framework列表（可选）
   * @param filePath - 可选的文件路径，用于本地存储
   */
  constructor(eaog: EaogNode, hooks: Hook[] = [], sideCPs: SideCP[] = [], frameworks: EaogFramework[] = [], filePath?: string) {
    this.hooks = hooks;
    this.sideCPs = sideCPs;
    this.frameworks = frameworks;
    this.filePath = filePath;
    this.eaog = eaog instanceof EditableEaogNode ? eaog : new EditableEaogNode(eaog, null, this); // 确保eaog是EditableEaogNode实例
  }

  /**
   * 添加一个Hook到CP
   * @param hook - 要添加的Hook
   */
  addHook(hook: Hook): void {
    this.hooks.push(hook);
  }

  /**
   * 添加一个SideCP到CP
   * @param sideCP - 要添加的SideCP
   */
  addSideCP(sideCP: SideCP): void {
    this.sideCPs.push(sideCP);
  }

  /**
   * 添加一个Framework到CP
   * @param framework - 要添加的Framework
   */
  addFramework(framework: EaogFramework): void {
    this.frameworks.push(framework);
  }

  /**
   * 将CP实例转换为JSON对象
   * @returns CP的JSON表示
   */
  toJSON(): CP {
    return {
      ...this,
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
      this.frameworks?.map(framework => framework.cloneDeep ? framework.cloneDeep() : smartCloneDeep(framework)),
      this.hooks?.map(h => smartCloneDeep(h)),
      this.sideCPs?.map(s => smartCloneDeep(s)),
      this.filePath
    );
  }
}

export function createEditableCP(cp: CP): EditableCP {
  const editableCP = new EditableCP(cp.eaog, cp.hooks, cp.sideCPs, cp.frameworks, cp.filePath);
  editableCP.history = new CPHistory(editableCP.cloneDeep());
  return editableCP;
}
