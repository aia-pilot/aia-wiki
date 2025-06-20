<script setup lang="ts">
import EditorToolbarButton from './editor-toolbar-button.vue';
import {IS_STANDALONE_APP, IS_DEV} from "#/utils/aia-constants";
import {
  convertToEaogRoot,
  currentEaog,
  currentNode,
  EditableEaogNode,
  updateCurrentEaog,
  validateEaog,
  zogErrorToString
} from '../models/editable-eaog-node';
import {useHistory} from '../composables/use-eaog-history';
import {message} from 'ant-design-vue';
import {onMounted, onUnmounted} from 'vue'; // 导入Vue的生命周期钩子

import Debug from 'debug';
import {triggerDownload} from "@vben-core/shared/utils";
// @ts-ignore 忽略导入的类型
import {eaogFrameworks} from "../models/eaog-framework";

const debug = Debug('aia:cp-toolbar');

const history = useHistory();

// 组件属性
const props = defineProps<{
  eaogNodeForm: InstanceType<typeof EaogNodeForm> | undefined; // EaogNodeForm实例，用于新建Eaog
}>();

const parseTextToEaog = (eaogTxt: any): EditableEaogNode | undefined => {
  let json;
  // 解析JSON文本
  try {
    json = JSON.parse(eaogTxt);
  } catch (err) {
    console.warn('导入失败，文件格式错误:', err);
    // 或者，evaluate as JavaScript object
    try {
      // eslint-disable-next-line no-eval
      json = Function('"use strict"; return (' + eaogTxt + ')')();
    } catch (err) {
      console.warn('导入失败，文件格式错误:', err);
      return;
    }
  }
  return convertToEaogRoot(json); // 转换为EditableEaogNode对象
}

/**
 * 导入EAOG数据，优先从剪切板导入，其次从文件导入
 */
const handleImport = async () => {
  debug('导入EAOG数据');
  const eaog = (IS_DEV && await importEaogFromClipboard() || loadFromLocalStorage('aia-editor-eaog')) || await importEaogFromFile();
  if (eaog) {
    debug('导入成功:', eaog);
    updateCurrentEaog(eaog); // 更新当前EAOG
    history.addToHistory(); // 添加当前EAOG到历史记录
  }
};

/**
 * 导出当前EAOG数据为JSON文本到系���剪贴板，当Shift键按下时，导出为文件（下载）
 */
const handleExport = async (event: MouseEvent | KeyBoardEvent) => {
  debug('导出当前EAOG');
  if (!currentEaog.value) {
    message.warning('当前没有可导出的数据');
    return;
  }

  const data = JSON.stringify(currentEaog.value, null, 2);
  await copyToClipboard(data);
  message.success('EAOG数据已导出到剪贴板');

  if (event.shiftKey) {
    downloadToFile(data);
  }
};

const applyFramework = (framework) => {
  debug(`添加'${framework.meta.name}' Framework`);
  // 直接获取选中节点并调用相���函数
  const selectedNodes = currentEaog.value?.getSelectedNodes();
  if (selectedNodes?.length > 0) {
    selectedNodes.forEach(node => {
      framework = framework.applyToEaog(node)

      framework.isCollapsed = true; // 默认折叠，除非用户展开。
      framework.markAsNewlyModifiedForAWhile();
    });
    history.addToHistory(); // 添加当前EAOG（已变更）到历史记录
  } else {
    message.warning('请先选择至少一个节点');
  }
};

const handleRefresh = () => {
  debug('刷新当前视图');
};

const handleOpen = () => {
  if (IS_STANDALONE_APP) {
    debug('打开本地EAOG文件');
    message.warning('功能尚未实现，敬请期待！');
  }
  // 打开文件的逻辑
};

const handleSave = () => {
  if (IS_STANDALONE_APP) {
    debug('保存当前EAOG到本地文件');
    message.warning('功能尚未实现，敬请期待！');
  }
};

const handleUndo = () => {
  const prevEaog = history.undo();
  debug('撤销操作，当前EAOG:', prevEaog);
  if (prevEaog) updateCurrentEaog(prevEaog);
};

const handleRedo = () => {
  const nextEaog = history.redo();
  debug('重做操作，当前EAOG:', nextEaog);
  if (nextEaog) updateCurrentEaog(nextEaog);
};

const handleValidate = () => {
  debug('校验EAOG数据');
  if (!currentEaog.value) {
    message.warning('当前没有可校验的数据');
    return;
  }
  const res = validateEaog(currentEaog.value);
  if (res.success) {
    message.success('EAOG数据校验通过，符合数格：CP Schema 0.0.1');
  } else {
    message.error(`EAOG数据校验失败: ${zogErrorToString(res.error)}`, 5);
  }
};

const importEaogFromClipboard = async (): Promise<EditableEaogNode | undefined> => {
  try {
    const text = await navigator.clipboard.readText();
    debug('从剪切板读取内容成功');
    return parseTextToEaog(text);
  } catch (err) {
    console.warn('无法读取剪切板内容:', err);
    return undefined;
  }
};

const loadFromLocalStorage = (key: string): EditableEaogNode | undefined => {
  const data = localStorage.getItem(key);
  if (data) {
    debug('从本地存储读取内容成功');
    return parseTextToEaog(data);
  }
  debug('本地存储中没有找到数据');
  return undefined;
};

const importEaogFromFile = (): Promise<EditableEaogNode | undefined> => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        debug('从文件读取内容成功');
        resolve(parseTextToEaog(content));
      };
      reader.onerror = () => {
        console.warn('读取文件失败');
        resolve(undefined);
      };
      reader.readAsText(file);
    };

    input.click(); // 触发文件选择对话框
  });
};

const copyToClipboard = async (data: any) => {
  try {
    await navigator.clipboard.writeText(data);
    debug('已复制到剪切板');
  } catch (err) {
    message.error(`无法复制到剪切板: ${JSON.stringify(err)}`);
  }
};

const downloadToFile = (data: any) => { // TODO: 用Vben的triggerDownload
  const href = 'data:text/json;charset=utf-8,' + encodeURIComponent(data);
  triggerDownload(href, 'eaog-export.json');
};

// 添加和移除键盘事件监听器
const onKeyDown = (event: KeyboardEvent) => {
  const isModifier = event.ctrlKey || event.metaKey; // 同时支持 Ctrl 和 Command(⌘)

  // Ctrl/⌘+N 新建
  if (isModifier && event.key === 'n') {
    event.preventDefault();
    props.eaogNodeForm?.createEaog();
  }
  // Ctrl/⌘+O 打开
  else if (isModifier && event.key === 'o') {
    event.preventDefault();
    handleOpen();
  }
  // Ctrl/⌘+S 保存
  else if (isModifier && event.key === 's') {
    event.preventDefault();
    handleSave();
  }
  // Ctrl/⌘+Z 撤销
  else if (isModifier && event.key === 'z' && !event.shiftKey) {
    event.preventDefault();
    handleUndo();
  }
  // Ctrl/⌘+Y 或 Ctrl/⌘+Shift+Z 重做
  else if ((isModifier && event.key === 'y') || (isModifier && event.shiftKey && event.key === 'z')) {
    event.preventDefault();
    handleRedo();
  }
  // Ctrl/⌘+Shift+I 导入
  else if (isModifier && event.shiftKey && event.key === 'i') {
    event.preventDefault();
    handleImport();
  }
  // Ctrl/⌘+Shift+E 导出
  else if (isModifier && event.shiftKey && event.key === 'e') {
    event.preventDefault();
    handleExport(event);
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <div class="flex items-center gap-2 p-2 border-b">
    <!-- 新建、 打开、导入组 -->
    <EditorToolbarButton icon="ant-design:file-add-outlined" tooltip="新建 Ctrl+N" @click="eaogNodeForm?.createEaog()"/>
    <EditorToolbarButton icon="lucide:folder-open" tooltip="打开 Ctrl+O" @click="handleOpen" :disabled="!IS_STANDALONE_APP"/>
    <EditorToolbarButton icon="lucide:upload" tooltip="导入 Ctrl+Shift+I" @click="handleImport"/>

    <!-- 分组间隔竖线  -->
    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- 导出、保存组 -->
    <EditorToolbarButton icon="lucide:save" tooltip="保存 Ctrl+S" @click="handleSave"
                         :disabled="!IS_STANDALONE_APP"/>
    <EditorToolbarButton icon="lucide:download" tooltip="导出 Ctrl+Shift+E" @click="handleExport"/>

    <!-- 分组间隔竖线  -->
    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- Frameworks：通知、报告、控制组 通知（事前）、报告��事前），报告（事后）-->
    <EditorToolbarButton v-for="framework in eaogFrameworks"
                         :icon="framework.meta.icon" :tooltip="framework.meta.name"
                         :disabled="!(currentEaog?.getSelectedNodes().length > 0)"
                         @click="applyFramework(framework)"/>

    <!-- 分组间隔竖线  -->
    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- 刷新、撤销、重做组 -->
    <EditorToolbarButton icon="lucide:refresh-cw" tooltip="刷新" @click="handleRefresh"/>
    <EditorToolbarButton icon="mdi:check-circle-outline" tooltip="校验" @click="handleValidate"/>
    <EditorToolbarButton icon="lucide:undo" tooltip="撤销 Ctrl+Z" :disabled="!history.canUndo()" @click="handleUndo"/>
    <EditorToolbarButton icon="lucide:redo" tooltip="重做 Ctrl+Y" :disabled="!history.canRedo()" @click="handleRedo"/>
  </div>
</template>
