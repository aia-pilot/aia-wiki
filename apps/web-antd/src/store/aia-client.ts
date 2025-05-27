/**
 * AiaClient 管理模块
 * 1. 应用加载时，setup AiaClient 连接状态的监听器
 * 2. 连接 AiaClient
 * 3. 监听用户信息变化，以新身份重新连接 AiaClient
 */
import {watch} from 'vue';
import {useUserStore} from '@vben/stores';

import Debug from 'debug';

const debug = Debug('aia:aia-client');
const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠

/**
 * AiaClient 管理
 * 统一初始化 AiaClient：设置监听器、连接客户端、监听用户变化
 * @returns 清理函数，用于移除监听器
 */
export const initAiaClient = async () => {
  const userStore = useUserStore();
  let unwatch: (() => void) | null = null;

  // 1. 初始化 AiaClient 连接状态的监听器
  // 监听 AiaClient 连接成功事件
  // @ts-ignore
  window.electronAPI.onAiaConnected(() => {
    debug('AiaClient connected event received');
    userStore.setAiaClientConnected(true);
  });

  // 监听 AiaClient 断开连接事件
  // @ts-ignore
  window.electronAPI.onAiaDisconnect(() => {
    debug('AiaClient disconnected event received');
    userStore.setAiaClientConnected(false);
  });

  // 2. 应用加载时连接 AiaClient
  const connectClient = async (userId?: string, token?: string) => {
    if (userId && token) {
      try {
        // @ts-ignore
        const connected = await window.electronAPI.connectAiaClient(aiaSvcBaseUrl, userId, token);
        debug('AiaClient connection attempt result:', connected);
        // 连接状态将通过事件监听器更新
      } catch (error) {
        console.error('Failed to connect AiA Client:', error);
        userStore.setAiaClientConnected(false);
      }
    } else {
      debug('No user ID or token available, skipping AiaClient connection');
    }
  };

  // 初始连接尝试
  const userId = userStore.userInfo?.id;
  const token = userStore.userInfo?.aiaClientBindToken;
  await connectClient(userId, token);

  // 3. 监听用户信息变化，以新身份重新连接 AiaClient
  unwatch = watch(
    () => userStore.userInfo?.id,
    async (newUserId, oldUserId) => {
      if (newUserId !== oldUserId) {
        // 断开现有连接
        // @ts-ignore
        await window.electronAPI.closeAiaClient();

        // 如果新用户有绑定的 token，则尝试连接
        const token = userStore.userInfo?.aiaClientBindToken;
        if (token) {
          await connectClient(newUserId, token);
        }
      }
    }
  );

  // 返回清理函数
  return {
    cleanup: () => {
      if (unwatch) {
        unwatch();
      }
      // @ts-ignore
      window.electronAPI.removeAiaConnectedListener();
      // @ts-ignore
      window.electronAPI.removeAiaDisconnectListener();
    },
  }
};
