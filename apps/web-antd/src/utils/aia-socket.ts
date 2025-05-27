import {watch} from 'vue';
import {io, Socket} from 'socket.io-client';
import {useUserStore} from '@vben/stores';
import {message} from 'ant-design-vue';
import Debug from 'debug';

const debug = Debug('aia:socket');

/**
 * AIA Socket客户端
 * 负责管理与服务端的WebSocket连接
 */
class AiaSocketClient {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private connected = false;
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();

  /**
   * 初始化Socket连接
   * @returns {Promise<void>}
   */
  async init(): Promise<void> {
    const userStore = useUserStore();

    // 当用户信息变化时，重新连接Socket
    this.watchUserChanges();

    if (!userStore.userInfo) {
      debug('用户未登录，不初始化Socket连接');
      return;
    }

    // 初始连接
    await this.connect(userStore.userInfo.userId);
  }

  /**
   * 监听用户变化
   */
  private watchUserChanges(): void {
    const userStore = useUserStore();

    // 使用watch API监听用户ID变化
    if (typeof window !== 'undefined') {
      // 这里假设Vue的watch API可以直接使用，或者使用其他方式实现监听
      // 实际项目中，可能需要导入相应的Vue组合式API
      watch(
        () => userStore.userInfo?.id,
        async (newUserId) => {
          if (newUserId && newUserId !== this.userId) {
            debug(`用户ID变更: ${this.userId} -> ${newUserId}`);
            await this.connect(newUserId);
          } else if (!newUserId && this.connected) {
            this.disconnect();
          }
        },
        {immediate: true}
      );
    }
  }

  /**
   * 连接到Socket服务
   * @param {string} userId - 用户ID
   * @returns {Promise<void>}
   */
  private async connect(userId: string): Promise<void> {
    if (this.connected && this.userId === userId) {
      debug('已经连接到相同用户的Socket，无需重连');
      return;
    }

    // 如果已有连接，先断开
    if (this.socket) {
      this.disconnect();
    }

    this.userId = userId;

    try {
      const socketUrl = import.meta.env.VITE_AIA_SVC_URL || '';
      if (!socketUrl) {
        throw new Error('未配置Socket服务地址');
      }

      debug(`正在连接Socket: ${socketUrl}`);
      this.socket = io(`${socketUrl}/aia`, {
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // 设置基本事件处理
      this.setupSocketEvents();

      // 等待连接建立
      await new Promise<void>((resolve, reject) => {
        if (!this.socket) return reject(new Error('Socket初始化失败'));

        const connectTimeout = setTimeout(() => {
          reject(new Error('Socket连接超时'));
        }, 5000);

        this.socket.once('connect', () => {
          clearTimeout(connectTimeout);
          debug(`Socket连接成功，用户ID: ${userId}`);
          resolve();
        });

        this.socket.once('connect_error', (err) => {
          clearTimeout(connectTimeout);
          reject(err);
        });
      });

      this.connected = true;
      debug(`Socket连接成功，用户ID: ${userId}`);
    } catch (error) {
      debug(`Socket连接失败: ${error instanceof Error ? error.message : String(error)}`);
      message.error(`AiA Socket连接失败，实时通知功能可能无法使用`);
    }
  }

  /**
   * 设置Socket基本事件处理
   */
  private setupSocketEvents(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      debug('Socket连接已建立');
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      debug(`Socket连接已断开: ${reason}`);
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      debug(`Socket错误: ${error}`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      debug(`Socket重新连接成功，尝试次数: ${attemptNumber}`);
      this.connected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      debug(`Socket重连失败: ${error}`);
    });

    // 恢复已注册的事件处理程序
    this.restoreEventHandlers();
  }

  /**
   * 恢复已注册的事件处理程序
   */
  private restoreEventHandlers(): void {
    if (!this.socket) return;

    // 为所有已注册的事件重新添加处理程序
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(handler => {
        this.socket?.on(event, handler);
      });
    });
  }

  /**
   * 断开Socket连接
   */
  disconnect(): void {
    if (this.socket) {
      debug('断开Socket连接');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.userId = null;
    }
  }

  /**
   * 监听Socket事件
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   */
  on<T = any>(event: string, handler: (data: T) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    // 保存处理程序
    const handlers = this.eventHandlers.get(event)!;
    handlers.add(handler);

    // 如果已连接，立即添加事件监听
    if (this.socket && this.connected) {
      this.socket.on(event, handler);
    }
  }

  /**
   * 移除Socket事件监听
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   */
  off<T = any>(event: string, handler: (data: T) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);

      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }

    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  /**
   * 发送事件到服务器
   * @param {string} event - 事件名称
   * @param {any} data - 事件数据
   */
  emit(event: string, data: any): void {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    } else {
      debug(`尝试发送事件 ${event} 失败：Socket未连接`);
    }
  }

  /**
   * 检查Socket是否已连接
   * @returns {boolean} 连接状态
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 获取当前用户ID
   * @returns {string|null} 用户ID
   */
  getCurrentUserId(): string | null {
    return this.userId;
  }
}

// 创建单例
export const aiaSocket = new AiaSocketClient();

export default aiaSocket;
