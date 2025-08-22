// @ts-ignore
import {convertCpLocateStrToRelativePath} from "../../../../../../../aia-cp-manager";

const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠
const eaogsDir = import.meta.env.VITE_CP_STORE_PATH!.replace(/\\/g, '/');


/**
 * 从 CP 模块定位字符串加载 CP 模块。从内部CP-store（npm pkg repo）中加载 CP 模块。
 * @param cpLocateStr
 * @deprecated
 */
export async function loadCpFromCpStr(cpLocateStr: string) {
  const modulePath = convertCpLocateStrToRelativePath(cpLocateStr);
  const cp = await loadCp(modulePath);
  const filePath = `${eaogsDir}/${modulePath}`;
  return { filePath, cp }
}

export async function loadCp(filePath: string) {
  // aia-svc/public/cp-store symbol link到了eaogsDir目录。 注意：ONLY FOR @DEV @POC
  if (filePath.startsWith('cp://')) {
    filePath = filePath.slice(5); // 去掉前缀cp://
    const names = filePath.split('/'); // 支持多级CP
    const name = names[names.length - 1]!; // 最后一个是CP名称
    filePath = `${filePath}/${name}.cp.js`; // 转换为相对路径
  }

  if (filePath.startsWith('cp-store/')) {
    filePath = filePath.slice(9); // 去掉前缀cp-store/
  }

  // TODO: use File Access API to load file from local disk
  const cp = await import(/* @vite-ignore */ `${aiaSvcBaseUrl}/cp-store/${filePath}?t=${Date.now()}`); // 加上时间戳，每次都更新
  return {cp, filePath};
}

/**
 * 从文件路径获取 CP 模块定位字符串。
 * 例如：/path/to/cp-store/folders/cp-name/cp-name.cp.js → cp://folders/cp-name
 * @param filePath
 */
export function getCpLocateStrFromFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const base = eaogsDir.endsWith('/') ? eaogsDir : eaogsDir + '/';

  if (!normalized.startsWith(base)) {
    throw new Error(`文件路径 ${filePath} 不在 VITE_CP_STORE_PATH 范围内`);
  }

  if (!normalized.endsWith('.cp.js')) {
    throw new Error(`文件路径 ${filePath} 不是有效的 CP 模块文件（应以 .cp.js 结尾）`);
  }

  const relativePath = normalized.slice(base.length);
  const cpPathName = relativePath.replace(/\.cp\.js$/, ''); // 去掉 .cp.js 后缀
  return `cp://${cpPathName}`; // 返回 CP 模块定位字符串
}
