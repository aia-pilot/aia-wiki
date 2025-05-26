/**
 * 监听 userStore中的 userInfo 变化，当其userInfo.id变化时，
 * 1. 断开现有连接：window.electronAPI.closeAiaClient
 * 2. 用userInfo.aiaClientBindToken 调用window.electronAPI.connectAiaClient
 * 3. 当连接成功时，设置 userStore.isAiaClientConnected = true
 */
import {watch} from 'vue';
import {useUserStore} from '@vben/stores';

const aiaSvcBaseUrl = import.meta.env.VITE_AIA_SVC_URL.replace(/\/$/, ''); // 去掉末尾的斜杠

// 监听 userInfo 的变化
export const watchUserChangeConnectAiaClient = () => {
  const userStore = useUserStore();
  watch(
    () => userStore.userInfo?.id,
    async (newUserId, oldUserId) => {
      if (newUserId !== oldUserId) {
        // 断开现有连接
        // @ts-ignore
        await window.electronAPI.closeAiaClient();

        // 如果新用户有绑定的 token，则尝试连接
        const token = userStore.userInfo?.aiaClientBindToken;
        if (token) {
          try {
            // @ts-ignore
            await window.electronAPI.connectAiaClient(aiaSvcBaseUrl, newUserId, token);
            userStore.setAiaClientConnected(true);
          } catch (error) {
            console.error('Failed to connect AiA Client:', error);
            userStore.setAiaClientConnected(false);
          }
        }
      }
    }
  )
};

