// @ts-ignore
import { eaogModules } from '../../../eaog-modules';

const eaogsDir = import.meta.env.VITE_EAOGS_PATH!.replace(/\\/g, '/');

export async function loadEaogModule(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/');
  const base = eaogsDir.endsWith('/') ? eaogsDir : eaogsDir + '/';

  if (!normalized.startsWith(base)) {
    throw new Error(`文件路径 ${filePath} 不在 VITE_EAOGS_PATH 范围内`);
  }

  const relativePath = normalized.slice(base.length);
  const loader = eaogModules[relativePath];

  if (!loader) {
    throw new Error(`未找到 EAOG 模块：${relativePath}`);
  }

  return loader();
}
