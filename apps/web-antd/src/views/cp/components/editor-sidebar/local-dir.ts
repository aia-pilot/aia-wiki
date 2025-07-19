import {ref} from "vue";
import type {FileNode} from "#/views/cp/components/editor-sidebar/local-dir-tree-item.vue";
// @ts-ignore
import {compactJson} from "../../../../../../../../aia-se-comp/src/eaog/compact-json.js";
import {loadCpModuleFromFilePath} from "#/views/cp/models/cp-loader";
import {mainCPModule} from "#/views/cp/models/cp-editor-state";
import {type EditableEaogNode} from "#/views/cp/models/editable-eaog-node";
import {prompt} from '@vben/common-ui';

import Debug from 'debug';

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

// TODO: 直接用saveCpToFile
export const saveEaogToFile = async (eaog: EditableEaogNode, isNew: boolean) => {
  const cp = isNew ? {eaog, hooks: [], sideCPs: []} : {...mainCPModule.value!.cp, eaog};
  const filePath = isNew ? await getNewFilePath() : mainCPModule.value!.filePath;
  await saveCpToFile(cp, filePath);
}

// TODO: 参数cp改为EditableEaogNode（内含了cp）
const saveCpToFile = async (cp: any, filePath: string) => {
  const [eaog, hooks, sideCPs] = [cp.eaog, cp.hooks, cp.sideCPs]
    .map((item: any) => item.toJSON ? item.toJSON() : item)
    .map((item: any) => compactJson(item, {keyNoQuotation: true}));
  const content = `// Auto-generated CP file
export const eaog = ${eaog};\n
export const hooks = ${hooks};\n
export const sideCPs = ${sideCPs};\n`;

  debug(`保存CP模块到本地目录, file path: ${filePath}`);
  // @ts-ignore
  await window.electronAPI.invokeMain('use-sys-write-file', { path: filePath, content });
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
