import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  // return requestClient.get<UserInfo>('/user/info');
  return requestClient.get<UserInfo>('http://localhost/wiki/auth/current-user', {
    withCredentials: true,
  });
}
