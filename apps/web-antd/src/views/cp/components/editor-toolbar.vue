<script setup lang="ts">
import EditorToolbarButton from './editor-toolbar-button.vue';
import {IS_STANDALONE_APP, IS_DEV} from "#/utils/aia-constants";
import { convertToEaogRoot, EditableEaogNode } from './eaog-node';
import { addNotifyBeforeNodes } from "../../../../../../../aia-se-comp/design/CPG函数/insert-notify-control-report.js";
import { useHistory } from '../composables/useHistory';
import {message} from 'ant-design-vue';

import Debug from 'debug';
const debug = Debug('aia:cp-toolbar');

const history = useHistory();
const props = defineProps<{
  eaogData: EditableEaogNode | null;
}>();

// 定义组件要触发的事件
const emit = defineEmits<{
  'update-eaog': [eaog: EditableEaogNode];
}>();

// 直接从 eaogData 获取选中的节点
const getSelectedNodes = (): EditableEaogNode[] => {
  if (!props.eaogData) return [];
  return props.eaogData.getSelectedNodes();
};

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
const handleExport = async (event) => {
  debug('导出当前EAOG');
  const data = JSON.stringify(props.eaogData, null, 2);
  await copyToClipboard(data);
  message.success('EAOG数据已导出到剪贴板');

  if (event.shiftKey) {
    downloadToFile(data);
  }
};

const handleReport = () => {
  debug('添加报告节点');
  // 直接获取选中节点并调用相关函数
  const selectedNodes = getSelectedNodes();
  if (selectedNodes.length > 0) {
    addNotifyBeforeNodes(selectedNodes);
    history.addToHistory(props.eaogData); // 添加当前EAOG到历史记录
  } else {
    message.warning('请先选择至少一个节点');
  }
};

const handleControl = () => {
  debug('添加控制节点');
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
  emit('update-eaog', prevEaog); // 触发更新事件
};

const handleRedo = () => {
  const nextEaog = history.redo();
  debug('重做操作，当前EAOG:', nextEaog);
  emit('update-eaog', nextEaog); // 触发更新事件
};

const importEaogFromClipboard = async (): Promise<EditableEaogNode | undefined> => {
  try {
    const text = await navigator.clipboard.readText();
    debug('从剪切板读取内容成功');
    return parseTextToEaog(text);
  } catch (err) {
    console.error('无法读取剪切板内容:', err);
    return null;
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
        resolve(null);
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
        resolve();
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

const downloadToFile = (data: any) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(data);
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "eaog-export.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};
</script>

<template>
  <div class="flex items-center gap-2 p-2 border-b">
    <!-- 打开、导入组 -->
    <EditorToolbarButton icon="lucide:folder-open" tooltip="打开" @click="handleOpen" :disabled="!IS_STANDALONE_APP"/>
    <EditorToolbarButton icon="lucide:upload" tooltip="导入" @click="handleImport" />

    <!-- 分组间隔竖线  -->
    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- 刷新、导出、保存组 -->
    <EditorToolbarButton icon="lucide:refresh-cw" tooltip="刷新" @click="handleRefresh" />
    <EditorToolbarButton icon="lucide:save" tooltip="保存" @click="handleSave" :disabled="!IS_STANDALONE_APP"/>
    <EditorToolbarButton icon="lucide:download" tooltip="导出" @click="handleExport" />

    <!-- 分组间隔竖线  -->
    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- 报告、控制组 -->
    <EditorToolbarButton icon="lucide:file-text" tooltip="报告" @click="handleReport" />
    <EditorToolbarButton icon="lucide:settings" tooltip="控制" @click="handleControl" />

    <!-- 分组间隔竖线  -->
    <div class="w-px h-6 bg-border mx-1"></div>

    <!-- 撤销、重做组 -->
    <EditorToolbarButton icon="lucide:undo" tooltip="撤销" :disabled="!history.canUndo()" @click="handleUndo" />
    <EditorToolbarButton icon="lucide:redo" tooltip="重做" :disabled="!history.canRedo()" @click="handleRedo" />
  </div>
</template>
