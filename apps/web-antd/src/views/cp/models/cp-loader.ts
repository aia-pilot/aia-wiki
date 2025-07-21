import { mainCPModule } from './cp-editor-state';
import type {CP} from "./types.d";
// @ts-ignore
import {parseCpModuleLocateStr} from "../../../../../../../aia-se-comp/src/action/parse-cp-module-locate-str.js";

const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠
const eaogsDir = import.meta.env.VITE_CP_STORE_PATH!.replace(/\\/g, '/');

/**
 * 从指定的文件路径加载 CP 模块，用在本地项目面板中，读取本地文件系统中的 CP 模块。
 * TODO：加上从云端用户云盘中读取
 * @param filePath
 */
export async function loadCpModuleFromFilePath(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/');
  const base = eaogsDir.endsWith('/') ? eaogsDir : eaogsDir + '/';

  if (!normalized.startsWith(base)) {
    throw new Error(`文件路径 ${filePath} 不在 VITE_CP_STORE_PATH 范围内`);
  }

  const relativePath = normalized.slice(base.length);
  const cp = await loadCp(relativePath);
  mainCPModule.value = { filePath: normalized, cp };
}

/**
 * 从 CP 模块定位字符串加载 CP 模块。从内部CP-store（npm pkg repo）中加载 CP 模块。
 * @param cpLocateStr
 */
export async function loadCpFromCpStr(cpLocateStr: string) {
  const innerModulePath = parseCpModuleLocateStr(cpLocateStr);
  const cp = await loadCp(innerModulePath);
  const filePath = `${eaogsDir}/${innerModulePath}`;
  return { filePath, cp }
}

async function loadCp(innerModulePath: string): Promise<CP> {
  // aia-svc/public/cp-store symbol link到了eaogsDir目录。 注意：ONLY FOR @DEV @POC
  const cp = await import(/* @vite-ignore */ `${aiaSvcBaseUrl}/cp-store/${innerModulePath}?t=${Date.now()}`); // 加上时间戳，每次都更新
  return cp;
}
