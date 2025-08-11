import {ref} from "vue";
import type {FileNode} from "#/views/cp/components/editor-sidebar/local-dir-tree-item.vue";
// @ts-ignore
import {compactJson} from "../../../../../../../../aia-se-comp/src/eaog/compact-json.js";
// @ts-ignore
import {prompt} from '@vben/common-ui';

import Debug from 'debug';
import type {EditableCP} from "#/views/cp/viewmodels/editable-cp";
import {loadCpModuleFromFilePath} from "#/views/cp/viewmodels/cp-editor-state";
import {message} from "ant-design-vue";
import {requestClient} from "#/api/request";

const debug = Debug('aia-wiki:local-dir');

export const localDirs = ref<FileNode[]>([]);
export const selected = ref<FileNode | undefined>();

export const isCpFile = (file: FileNode) => {
  return !file.isDirectory && file.path.endsWith('.cp.js');
}

const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠
export const loadCPDirTree = async () => {
  return requestClient.get(`${aiaSvcBaseUrl}/cp`, {withCredentials: true,})
    .catch((err: any) => {
      debug('获取CP列表失败:', err);
      message.error('获取CP列表失败');
      return [];
    });
}

export const loadCpToEditor = async () => {
  if (isCpFile(selected.value!)) {
    await loadCpModuleFromFilePath(selected.value!.path).catch((err) => {
      debug(`加载CP模块失败: `, err);
      message.warn(`加载CP模块失败: ${err.message}`, 10);
    });
  }
}


// TODO: 参数cp改为EditableEaogNode（内含了cp）
export const saveCpToFile = async (cp: EditableCP, isNew: boolean) => {
  const options =  {maxInlineLength: 120, indent: 2, keyNoQuotation: true}
  const eaogStr = compactJson(cp.eaog, options);
  const hooksStr = compactJson(cp.hooks, options);
  const sideCPsStr = compactJson(cp.sideCPs!, options);
  const frameworksStr = compactJson(cp.frameworks, options);
  // const cpStr = compactJson(cp);
  isNew && (cp.filePath = await getNewFilePath());
  const code = `// Auto-generated CP file
export const eaog = ${eaogStr};\n
export const hooks = ${hooksStr};\n
export const sideCPs = ${sideCPsStr};\n
export const frameworks = ${frameworksStr};\n`;

  debug(`保存CP模块到本地目录, file path: ${cp.filePath}`);
  // @ts-ignore
  // await window.electronAPI.invokeMain('use-sys-write-file', { path: cp.filePath, content });
  await requestClient.post(`${aiaSvcBaseUrl}/cp`, {filePath: cp.filePath, code}, {withCredentials: true})
    .catch((err: any) => {
      debug('保存CP模块到本地目录失败:', err);
      message.error('保存CP模块到本地目录失败');
    });
}


async function getNewFilePath() {
  return getCurrentDirPath() + '/' + (await prompt({content: '请输入新EAOG文件名（将自动附加.cp.js后缀）'})) + '.cp.js';
}

function getCurrentDirPath() {
  if (!selected.value) {
    throw new Error('没有选中的目录或文件');
  }
  return selected.value.isDirectory ? selected.value.path : selected.value.path.substring(0, selected.value.path.lastIndexOf('/'));
}
