import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}


const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>(`${aiaSvcBaseUrl}/wiki/auth/login`, data, {
    withCredentials: true,
  })
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>(`${aiaSvcBaseUrl}/wiki/auth/refresh`, {
    withCredentials: true,
  });

  // return baseRequestClient.post<AuthApi.RefreshTokenResult>('/auth/refresh', {
  //   withCredentials: true,
  // });
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return baseRequestClient.post(`${aiaSvcBaseUrl}/wiki/auth/logout`, {}, {
    withCredentials: true,
  });

  // return baseRequestClient.post('/auth/logout', {
  //   withCredentials: true,
  // });
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>(`${aiaSvcBaseUrl}/wiki/auth/codes`, {
    withCredentials: true,
  });
  // return requestClient.get<string[]>('/auth/codes');
}
