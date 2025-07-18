import { currentCP } from './cp-editor-state';
// @ts-ignore
import {parseCpModuleLocateStr} from "../../../../../../../aia-se-comp/src/action/parse-cp-module-locate-str.js";

const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠
const eaogsDir = import.meta.env.VITE_CP_STORE_PATH!.replace(/\\/g, '/');

export async function loadCpModuleFromFilePath(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/');
  const base = eaogsDir.endsWith('/') ? eaogsDir : eaogsDir + '/';

  if (!normalized.startsWith(base)) {
    throw new Error(`文件路径 ${filePath} 不在 VITE_CP_STORE_PATH 范围内`);
  }

  const relativePath = normalized.slice(base.length);
  const cp = await loadCpModule(relativePath);
  currentCP.value = { filePath: normalized, cp };
}

export async function loadCpModuleFromCpStr(cpStr: string) {
  const innerModulePath = parseCpModuleLocateStr(cpStr);
  const cp = await loadCpModule(innerModulePath);
  const filePath = `${eaogsDir}/${innerModulePath}`;
  currentCP.value = { filePath, cp }
}

async function loadCpModule(innerModulePath: string) {
  // aia-svc/public/cp-store symbol link到了eaogsDir目录。 注意：ONLY FOR @DEV @POC
  const cp = await import(/* @vite-ignore */ `${aiaSvcBaseUrl}/cp-store/${innerModulePath}?t=${Date.now()}`); // 加上时间戳，每次都更新
  return cp;
}
