import {ref, type Ref, watch} from 'vue';
import {createEaogFromCp, EditableEaogNode} from './editable-eaog-node';
import type {CP, EaogNode} from "#/views/cp/models/index";
// @ts-ignore 忽略导入的类型

/**
 * CP Editor 的核心状态管理
 * 定义和管理 CP Editor 用户交互逻辑的核心状态变量，并处理它们之间的约束关系
 */

// CP模块状态：当前加载的CP模块
export const currentCP = ref<{ filePath: string, cp: CP } | undefined>(undefined);

// EAOG状态：当前EAOG数据作为全局共享状态
export const currentEaog: Ref<EditableEaogNode | undefined> = ref(undefined);

// 节点状态：当前被选择的节点
export const currentNode: Ref<EditableEaogNode | undefined> = ref(undefined);

// 工作区面板状态：当前活动的工作面板
export const currentPane: Ref<string | undefined> = ref(undefined);

// 标签页状态：当前活动的标签页
export const currentTab: Ref<string | undefined> = ref(undefined);

/**
 * 状态间的约束关系处理
 */

// 当CP模块变化时，更新当前EAOG
watch(currentCP, (newCP) => {
  if (newCP?.cp?.eaog) {
    currentEaog.value = createEaogFromCp(newCP.cp)
  } else {
    currentEaog.value = undefined;
  }
});

// 当EAOG变化时，重置当前节点
watch(currentEaog, (_) => {
  currentNode.value = undefined;
});

/**
 * 从外部（file、store、API等）加载当前Eaog数据
 * 1. 改变Editor中的Eaog
 * 2. 初始化历史记录，便于撤销/重做
 * @param eaog
 * @param needSave 是否需要保存为新创建的Eaog，默认为false
 * @param isNew 是否为新创建的Eaog，默认为false
 */
export const loadCurrentEaog = async (eaog: EditableEaogNode | EaogNode | string, needSave = false, isNew = false) => {
  const data = eaog instanceof EditableEaogNode ? eaog : typeof eaog === 'string' ? JSON.parse(eaog) : eaog;
  const eaogData = eaog instanceof EditableEaogNode ? data : createEaogFromCp({eaog: data});

  currentEaog.value = eaogData;
  // 直接初始化EAOG历史记录
  eaogData.initRoot();

  if (needSave) {
    await saveCurrentEaog(isNew); // 如果需要保存，则保存为新创建的Eaog
  }
}

/**
 * 将当前Eaog数据保存到历史记录和外部（file、store、API等）
 * @param isNew 是否为新创建的Eaog，默认为false
 */
export const saveCurrentEaog = async (isNew = false) => {
  // 直接使用EAOG的addToHistory方法
  currentEaog.value?.addToHistory();
  await eaogSaver.value?.(currentEaog.value, isNew)
}


/**
 * 保存EAOG的函数引用
 * 用于在不同组件间共享保存逻辑
 */
export const eaogSaver = ref<((eaog: any, isNew: boolean) => Promise<void>) | null>(null);
