import { ref } from 'vue';

// CPE中正在操作的CP模块
export const currentCP= ref<{ filePath: string, cp: any } | null>(null);

const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠
const eaogsDir = import.meta.env.VITE_EAOGS_PATH!.replace(/\\/g, '/');

export async function loadCpModule(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/');
  const base = eaogsDir.endsWith('/') ? eaogsDir : eaogsDir + '/';

  if (!normalized.startsWith(base)) {
    throw new Error(`文件路径 ${filePath} 不在 VITE_EAOGS_PATH 范围内`);
  }

  const relativePath = normalized.slice(base.length);
  // aia-svc/public/cp-store symbol link到了eaogsDir目录。 注意：ONLY FOR @DEV @POC
  const cp = await import(/* @vite-ignore */ `${aiaSvcBaseUrl}/cp-store/${relativePath}`);
  currentCP.value = { filePath: normalized, cp };
}
