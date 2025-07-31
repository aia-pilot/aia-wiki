import {ref} from "vue";
import type {FileNode} from "#/views/cp/components/editor-sidebar/local-dir-tree-item.vue";
// @ts-ignore
import {compactJson} from "../../../../../../../../aia-se-comp/src/eaog/compact-json.js";
import {loadCpModuleFromFilePath} from "#/views/cp/services/cp-loader";
import {prompt} from '@vben/common-ui';

import Debug from 'debug';
import type {EditableCP} from "#/views/cp/viewmodels/editable-cp";

const debug = Debug('aia-wiki:local-dir');

export const localDirs = ref<FileNode[]>([]);
export const selected = ref<FileNode | undefined>(undefined);

export const isCpFile = (file: FileNode) => {
  return !file.isDirectory && file.path.endsWith('.cp.js');
}

export const loadCpToEditor = async () => {
  if (isCpFile(selected.value!)) {
    await loadCpModuleFromFilePath(selected.value!.path);
  }
}


// TODO: 参数cp改为EditableEaogNode（内含了cp）
export const saveCpToFile = async (cp: EditableCP, isNew: boolean) => {
  const [eaog, hooks, sideCPs, frameworks] = [cp.eaog, cp.hooks, cp.sideCPs, cp.frameworks]
    .map((item: any) => item.toJSON ? item.toJSON() : item)
    .map((item: any) => compactJson(item, {keyNoQuotation: true}));
  // const {eaog, hooks, sideCPs, frameworks} = cp.toJSON();
  isNew && (cp.filePath = await getNewFilePath());
  const content = `// Auto-generated CP file
export const eaog = ${eaog};\n
export const hooks = ${hooks};\n
export const sideCPs = ${sideCPs};\n
export const frameWorks = ${frameworks};\n`;

  debug(`保存CP模块到本地目录, file path: ${cp.filePath}`);
  // @ts-ignore
  await window.electronAPI.invokeMain('use-sys-write-file', { path: cp.filePath, content });
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
