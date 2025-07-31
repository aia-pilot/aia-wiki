import {computed, ref, watch, watchEffect} from 'vue';
import type {EditableEaogNodeVMType} from './editable-eaog-node-vm';
import type {EditableCP} from '../viewmodels/editable-cp';
import type {CP} from "#/views/cp/models/types";
import {ShowAtType} from "#/views/cp/models/editable-integration-manager";
import type {EditableSideCP} from "#/views/cp/viewmodels/editable-side-cp";
import {uniqBy} from "lodash-es";

/**
 * CP Editor 的核心状态管理
 * 定义和管理 CP Editor 用户交互逻辑的核心状态变量，并处理它们之间的约束关系
 */

// CP模块状态：当前加载的CP模块
export const mainCPModule = ref<{ filePath: string, cp: CP } | undefined>();

// 主CP
export const mainCP = ref<EditableCP | undefined>();

// 并行CP
export const parallelCPs = ref<EditableSideCP[] | undefined>();

export const parallelCPsDomReady = ref<EditableSideCP[] | undefined>(); // 延迟到parallel CPs Dom Ready 以便划线

// 统一对外暴露一个 currentCP，因为虽然有主CP和并行CP，但在编辑器中只有一个当前正在编辑（交互）的CP，toolbar、context-menu、node-form都是针对这个CP进行操作的
export const currentCP = computed({
  get() {
    return mainCP.value
  },
  set(val: EditableCP) {
    mainCP.value = val as EditableCP;
  }
})

// 当前EAOG - 为了兼容性保留，实际上是当前CP的EAOG
export const currentEaog = computed(() => currentCP.value?.eaog);

// 节点状态：当前被选择的节点
export const currentNode= ref<EditableEaogNodeVMType | undefined>();

// 工作区面板状态：当前活动的工作面板
export const currentPane = ref<string | undefined>();

// 标签页状态：当前活动的标签页
export const currentTab = ref<string | undefined>();


// 当CP模块变化时，更新当前CP
watch(mainCPModule, async (newCPM) => {
  if (newCPM?.cp) {
    const {createEditableCP} = await import('./editable-cp'); // 动态导入，避免循环依赖
    const cp = await createEditableCP(newCPM.cp as CP, newCPM.filePath);
    mainCP.value = cp;
  } else {
    mainCP.value = undefined;
  }
});

// 当CP变化时，重置当前节点
watch(currentCP, (_) => {
  currentNode.value = undefined;
});

watchEffect(async () => {
  const sideCPs = mainCP.value?.eaog.integrationManager?.integrations
    /* 集成展示中，且发起节点未被折叠 */
    .filter(({isLoaded, integrator, showAt}) => isLoaded && !integrator!.isBeenCollapsed && showAt === ShowAtType.Parallel)
    .map(integration => integration.sideCP);
  parallelCPs.value = uniqBy(sideCPs, 'waiterCP') as EditableSideCP[];

  setTimeout(() => {
    parallelCPsDomReady.value = parallelCPs.value;
  }, 1000)
})

/**
 * 从外部（file、store、API等）加载当前CP数据
 * 1. 改变Editor中的CP
 * 2. 初始化历史记录，便于撤销/重做
 * @param cp
 * @param needSave 是否需要保存为新创建的CP，默认为false
 * @param isNew 是否为新创建的CP，默认为false
 */
export const loadCurrentCP = async (cp: EditableCP | CP | string, needSave = false, isNew = false) => {
  let cpData: EditableCP;

  const {EditableCP, createEditableCP} = await import('./editable-cp'); // 动态导入，避免循环依赖
  if (cp instanceof EditableCP) {
    cpData = cp;
  } else if (typeof cp === 'string') {
    const parsedCP = JSON.parse(cp);
    cpData = await createEditableCP(parsedCP);
  } else {
    cpData = await createEditableCP(cp);
  }

  currentCP.value = cpData;

  if (needSave) {
    await saveCurrentCP(isNew); // 如果需要保存，则保存为新创建的CP
  }
}

/**
 * 将当前CP数据保存到历史记录和外部（file、store、API等）
 * @param isNew 是否为新创建的CP，默认为false
 */
export const saveCurrentCP = async (isNew = false) => {
  // 使用CP的addToHistory方法
  currentCP.value?.addToHistory();
  await cpSaver.value?.(currentCP.value, isNew)
}

/**
 * 加载并行CP，并行CP将出现在ParallelCP Pane中
 * @param modulePath
 * @deprecated 该方法已弃用，同时，调用它的cp-panel也要改动
 */
export const loadParallelCP = async (modulePath: string) => {
  const {loadCpFromCpStr} = await import('../services/cp-loader');
  const {createEditableCP} = await import('./editable-cp'); // 动态导入，避免循环依赖
  const {cp, filePath} = await loadCpFromCpStr(modulePath)
  parallelCPs.value = {cp: await createEditableCP(cp, filePath)};
}

/**
 * 保存CP的函数引用
 * 用于在不同组件间共享保存逻辑
 */
export const cpSaver = ref<((cp: any, isNew: boolean) => Promise<void>) | null>(null);



