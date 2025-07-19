import {ref, type Ref, watch, computed} from 'vue';
import {createEaogFromCp, EditableEaogNode} from './editable-eaog-node';
import type {CP, EaogNode} from "#/views/cp/models/index";
import {loadCpFromCpStr} from "#/views/cp/models/cp-loader";
// @ts-ignore 忽略导入的类型

/**
 * CP Editor 的核心状态管理
 * 定义和管理 CP Editor 用户交互逻辑的核心状态变量，并处理它们之间的约束关系
 */

// CP模块状态：当前加载的CP模块
export const mainCPModule = ref<{ filePath: string, cp: CP } | undefined>(undefined);

// 主CP对应的EAOG
export const mainEaog: Ref<EditableEaogNode | undefined> = ref(undefined);

// 辅CP对应的EAOG
export const sideEaog: Ref<EditableEaogNode | undefined> = ref(undefined);

// 统一对外暴露一个 currentEaog，因为虽然有主CP和辅CP，但在编辑器中只有一个当前正在编辑（交互）的EAOG，toolbar、context-menu、node-form都是针对这个EAOG进行操作的
export const currentEaog = computed({
  get() {
    // return currentPane.value
    return mainEaog.value
  },
  set(val: EditableEaogNode) {
    mainEaog.value = val as EditableEaogNode;
    // if (currentEditor.value === 'main') {
    //   mainContent.value = val
    // } else {
    //   sideContent.value = val
    // }
  }
})

// 节点状态：当前被选择的节点
export const currentNode: Ref<EditableEaogNode | undefined> = ref(undefined);

// 工作区面板状态：当前活动的工作面板
export const currentPane: Ref<string | undefined> = ref(undefined);

// 标签页状态：当前活动的标签页
export const currentTab: Ref<string | undefined> = ref(undefined);


// 当CP模块变化时，更新当前EAOG。
watch(mainCPModule, (newCPM) => {
  if (newCPM?.cp?.eaog) {
    mainEaog.value = createEaogFromCp(newCPM.cp)
  } else {
    mainEaog.value = undefined;
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

export const loadSideCpEaog = async (modulePath: string) => {
  modulePath = modulePath.replace(/^cp:\/\//, ''); // 去掉前缀cp://
  const cp = await loadCpFromCpStr(modulePath)
  sideEaog.value = createEaogFromCp(cp);
}

/**
 * 保存EAOG的函数引用
 * 用于在不同组件间共享保存逻辑
 */
export const eaogSaver = ref<((eaog: any, isNew: boolean) => Promise<void>) | null>(null);
