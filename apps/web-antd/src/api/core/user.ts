import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  // return requestClient.get<UserInfo>('/user/info');
  return requestClient.get<UserInfo>(`${aiaSvcBaseUrl}/wiki/auth/current-user`, {
    withCredentials: true,
  });
}
