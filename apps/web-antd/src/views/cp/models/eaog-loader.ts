// @ts-ignore
// import { eaogModules } from '#/eaog-modules';
//

const eaogsDir = import.meta.env.VITE_EAOGS_PATH!.replace(/\\/g, '/');
//
// export async function loadCpModule(filePath: string) {
//   const normalized = filePath.replace(/\\/g, '/');
//   const base = eaogsDir.endsWith('/') ? eaogsDir : eaogsDir + '/';
//
//   if (!normalized.startsWith(base)) {
//     throw new Error(`文件路径 ${filePath} 不在 VITE_EAOGS_PATH 范围内`);
//   }
//
//   const relativePath = normalized.slice(base.length);
//   //@ts-ignore
//   const loader = eaogModules[relativePath];
//
//   if (!loader) {
//     throw new Error(`未找到 EAOG 模块：${relativePath}`);
//   }
//
//   return loader();
// }

const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠

export async function loadCpModule(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/');
  const base = eaogsDir.endsWith('/') ? eaogsDir : eaogsDir + '/';

  if (!normalized.startsWith(base)) {
    throw new Error(`文件路径 ${filePath} 不在 VITE_EAOGS_PATH 范围内`);
  }

  const relativePath = normalized.slice(base.length);
  // aia-svc/public/cp-store symbol link到了eaogsDir目录。 注意：ONLY FOR @DEV @POC
  return await import(/* @vite-ignore */ `${aiaSvcBaseUrl}/cp-store/${relativePath}`);
}
