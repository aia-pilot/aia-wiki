<script setup lang="ts">
import EditorToolbarButton from './editor-toolbar-button.vue';
import {IS_STANDALONE_APP, IS_DEV} from "#/utils/aia-constants";
import {convertToEaogRoot, EditableEaogNode, validateEaog} from '../models/eaog-node';
import {useHistory} from '../composables/useHistory';
import {message} from 'ant-design-vue';

import Debug from 'debug';
import {triggerDownload} from "@vben-core/shared/utils";
// @ts-ignore 忽略导入的类型
import {eaogFrameworks} from "../models/eaog-framework";

const debug = Debug('aia:cp-toolbar');

const history = useHistory();
const props = defineProps<{
  currentEaog: EditableEaogNode | null;
}>();

// 定义组件要触发的事件
const emit = defineEmits<{
  'update-eaog': [eaog: EditableEaogNode];
}>();

// 工具栏操作处理函数
const handleRefresh = () => {
  debug('刷新当前视图');
};

const parseTextToEaog = (eaogTxt: any): EditableEaogNode | undefined => {
  let json;
  // 解析JSON文本
  try {
    json = JSON.parse(eaogTxt);
  } catch (err) {
    console.error('导入失败，文件格式错误:', err);
    // 或者，evaluate as JavaScript object
    try {
      // eslint-disable-next-line no-eval
      json = Function('"use strict"; return (' + eaogTxt + ')')();
    } catch (err) {
      console.error('导入失败，文件格式错误:', err);
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
  const eaog = (IS_DEV && await importEaogFromClipboard()) || await importEaogFromFile();
  if (eaog) {
    debug('导入成功:', eaog);
    // history.clear(); // 清除历史记录
    history.addToHistory(eaog); // 添加当前EAOG到历史记录
    emit('update-eaog', eaog); // 触发更新事件，传递克隆的EAOG数据
    // 历史记录在 editor 中处理，不需要在这里触发事件
  }
};

/**
 * 导出当前EAOG数据为JSON文本到系统剪贴板，当Shift键按下时，导出为文件（下载）
 */
const handleExport = async (event: MouseEvent) => {
  debug('导出当前EAOG');
  const data = JSON.stringify(props.currentEaog, null, 2);
  await copyToClipboard(data);
  message.success('EAOG数据已导出到剪贴板');

  if (event.shiftKey) {
    downloadToFile(data);
  }
};

const applyFramework = (framework) => {
  debug(`添加'${framework.meta.name}' Framework`);
  // 直接获取选中节点并调用相关函数
  const selectedNodes = props.currentEaog?.getSelectedNodes();
  if (selectedNodes?.length > 0) {
    selectedNodes.forEach(node => {
      framework = framework.applyToEaog(node)

      // 压缩不必要的层级。
      // const children = framework.children;
      // const isShrunken = framework.shrinkSequentialParent();
      // const isShrunken = false;

      // 标记为新修改的节点，以便展示动效。
      // const newNodes = isShrunken ? children : [framework];
      // newNodes.forEach(node => node === eaog || node.markAsNewlyModifiedForAWhile())

      framework.isCollapsed = true; // 默认折叠，除非用户展开。
      framework.markAsNewlyModifiedForAWhile();
    });
    history.addToHistory(props.currentEaog); // 添加当前EAOG（已变更）到历史记录
  } else {
    message.warning('请先选择至少一个节点');
  }
};

const handleOpen = () => {
  debug('打开EAOG数据');
};

const handleSave = () => {
  debug('保存当前EAOG数据');
};

const handleUndo = () => {
  const prevEaog = history.undo();
  debug('撤销操作，当前EAOG:', prevEaog);
  if (prevEaog) emit('update-eaog', prevEaog); // 触发更新事件
};

const handleRedo = () => {
  const nextEaog = history.redo();
  debug('重做操作，当前EAOG:', nextEaog);
  if (nextEaog) emit('update-eaog', nextEaog); // 触发更新事件
};

const handleValidate = () => {
  debug('校验EAOG数据');
  if (!props.currentEaog) {
    message.warning('当前没有可校验的数据');
    return;
  }
  const res = validateEaog(props.currentEaog);
  if (res.success) {
    message.success('EAOG数据校验通过，符合数格：CP Schema 0.0.1');
  } else {
    console.error('EAOG数据校验失败:', res.error);
  }
};

const importEaogFromClipboard = async (): Promise<EditableEaogNode | undefined> => {
  try {
    const text = await navigator.clipboard.readText();
    debug('从剪切板读取内容成功');
    return parseTextToEaog(text);
  } catch (err) {
    console.error('无法读取剪切板内容:', err);
    return undefined;  // 返回undefined而不是null
  }
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
        console.error('读取文件失败');
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
    console.error('无法复制到剪切板:', err);
  }
};

const downloadToFile = (data: any) => { // TODO: 用Vben的triggerDownload
  const href = 'data:text/json;charset=utf-8,' + encodeURIComponent(data);
  triggerDownload(href, 'eaog-export.json');
  // const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(data);
  // const downloadAnchorNode = document.createElement('a');
  // downloadAnchorNode.setAttribute("href", dataStr);
  // downloadAnchorNode.setAttribute("download", "eaog-export.json");
  // document.body.appendChild(downloadAnchorNode);
  // downloadAnchorNode.click();
  // downloadAnchorNode.remove();
};
</script>

<template>
  <div class="flex items-center gap-2 p-2 border-b">
    <!-- 打开、导入组 -->
    <EditorToolbarButton icon="lucide:folder-open" tooltip="打开" @click="handleOpen"
                         :disabled="!IS_STANDALONE_APP"/>
    <EditorToolbarButton icon="lucide:upload" tooltip="导入" @click="handleImport"/>

    <!-- 分组间隔竖线  -->
    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- 导出、保存组 -->
    <EditorToolbarButton icon="lucide:save" tooltip="保存" @click="handleSave"
                         :disabled="!IS_STANDALONE_APP"/>
    <EditorToolbarButton icon="lucide:download" tooltip="导出" @click="handleExport"/>

    <!-- 分组间隔竖线  -->
    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- Frameworks：通知、报告、控制组 通知（事前）、报告（事前），报告（事后）-->
    <EditorToolbarButton v-for="framework in eaogFrameworks"
                         :icon="framework.meta.icon" :tooltip="framework.meta.name"
                         :disabled="!(props.currentEaog?.getSelectedNodes().length > 0)"
                         @click="applyFramework(framework)"/>


<!--    <EditorToolbarButton icon="ant-design:notification-outlined" tooltip="通知" @click="applyFramework(notifyEaogFramework, '通知')"/>-->
<!--    <EditorToolbarButton icon="ic:outline-airline-stops" tooltip="控制" @click="applyFramework(controlEaogFramework, '控制')"/>-->
<!--    <EditorToolbarButton icon="ic:baseline-read-more" tooltip="报告" @click="applyFramework(reportEaogFramework, '报告')"/>-->

    <!-- 分组间隔竖线  -->
    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- 刷新、撤销、重做组 -->
    <EditorToolbarButton icon="lucide:refresh-cw" tooltip="刷新" @click="handleRefresh"/>
    <EditorToolbarButton icon="mdi:check-circle-outline" tooltip="校验" @click="handleValidate"/>
    <EditorToolbarButton icon="lucide:undo" tooltip="撤销" :disabled="!history.canUndo()" @click="handleUndo"/>
    <EditorToolbarButton icon="lucide:redo" tooltip="重做" :disabled="!history.canRedo()" @click="handleRedo"/>
  </div>
</template>
