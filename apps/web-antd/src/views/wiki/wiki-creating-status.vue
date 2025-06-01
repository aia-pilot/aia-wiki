<script setup lang="ts">
import {onMounted, onUnmounted, defineProps, computed, reactive} from 'vue';
import { VbenIcon } from '@vben-core/shadcn-ui';
import { Spin } from 'ant-design-vue';
import {
  start,
  stop,
  isConnected,
  progressMessages as globalProgressMessages,
  type BaseMessage,
  MessageType
} from './wiki-progress-mcp';

const connecting = computed(() => !isConnected.value);
const progressMessages = computed(() => props.useFakeData ? fakeProgressMessages : globalProgressMessages.filter((msg: BaseMessage) => msg.data.id === props.wikiId));

// 定义组件属性
const props = defineProps({
  // 知识库ID
  wikiId: {
    type: String,
    required: true,
  },
  // 是否使用模拟数据（用于测试）
  useFakeData: {
    type: Boolean,
    default: false,
  },
});

// 模拟数据，用于测试
  const fakeMessages: BaseMessage[] = [
    { type: MessageType.INFO, message: '开始处理知识库数据...' , data: { id: 'fake-wiki-id' }},
    { type: MessageType.PROGRESS, message: '正在解析文档内容', data: { id: 'fake-wiki-id', total: 5, current: 1 } },
    { type: MessageType.PROGRESS, message: '正在提取文档关键信息', data: { id: 'fake-wiki-id', total: 5, current: 2 } },
    { type: MessageType.WARNING, message: '部分文档内容格式不规范，尝试自动修复', data: { id: 'fake-wiki-id', file: 'document3.md' } },
    { type: MessageType.PROGRESS, message: '正在生成文档向量嵌入', data: { id: 'fake-wiki-id', total: 5, current: 3 } },
    { type: MessageType.ERROR, message: '文档处理错误', data: { id: 'fake-wiki-id', file: 'document4.md', error: 'Parsing error at line 120' } },
    { type: MessageType.PROGRESS, message: '正在构建知识图谱连接', data: { id: 'fake-wiki-id', total: 5, current: 4 } },
    { type: MessageType.SUCCESS, message: '知识库数据处理完成', data: { id: 'fake-wiki-id', total: 5, current: 5, success: 4, failed: 1 } },
  ];
// 添加模拟数据
const fakeProgressMessages = reactive<BaseMessage[]>([]);
const addFakeMessage = (index: number) => {
  if (index < fakeMessages.length) {
    const message = fakeMessages[index];
    fakeProgressMessages.push(message as BaseMessage);
    setTimeout(() => addFakeMessage(index + 1), 1500);
  }
};

// 获取消息图标
const getMessageIcon = (type: MessageType) => {
  const iconMap: Record<string, string> = {
    info: 'carbon:information',
    success: 'carbon:checkmark-filled',
    warning: 'carbon:warning',
    error: 'carbon:error-filled',
    progress: 'carbon:in-progress',
  };
  return iconMap[type] || 'carbon:time';
};

// 获取消息类型对应的样式类
const getMessageClass = (type: MessageType) => {
  return `message-${type || 'info'}`;
};

onMounted(() => {
  props.useFakeData
    ? addFakeMessage(0) // 使用模拟数据
    : start(); // 启动实际处理
});

onUnmounted(() => {
  props.useFakeData || stop(); // 停止实际处理
});
</script>

<template>
  <div class="wiki-creating-status">
    <div class="status-header">
      <VbenIcon icon="carbon:time" class="status-icon" />
      <p class="status-title">正在处理知识库数据，这可能需要一些时间。</p>
      <p class="sub-message">您无需刷新页面，状态会自动更新。</p>
    </div>

    <div class="progress-container">
      <Spin v-if="connecting" />

      <div class="progress-messages" v-if="progressMessages.length > 0">
        <div
          v-for="(message, index) in progressMessages"
          :key="index"
          class="progress-message"
          :class="getMessageClass(message.type as MessageType)"
        >
          <VbenIcon :icon="getMessageIcon(message.type as MessageType)" class="message-icon" />
          <div class="message-content">
            <span class="message-text">{{ message.message }}</span>
            <div v-if="message.data" class="message-data">
              {{ typeof message.data === 'object' ? JSON.stringify(message.data) : message.data }}
            </div>
          </div>
        </div>
      </div>

      <div v-else class="no-messages">
        <p>等待进度消息...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wiki-creating-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 40px 20px;
}

.status-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
  text-align: center;
}

.status-icon {
  font-size: 48px;
  color: #1677ff;
  margin-bottom: 16px;
}

.status-title {
  font-size: 18px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 8px;
}

.sub-message {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.45);
}

.progress-container {
  width: 100%;
  max-width: 600px;
  min-height: 200px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 16px;
  background-color: #f9f9f9;
  overflow-y: auto;
  max-height: 400px;
}

.progress-messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-message {
  display: flex;
  align-items: flex-start;
  padding: 8px 12px;
  border-radius: 4px;
  background-color: #f0f0f0;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-icon {
  font-size: 16px;
  margin-right: 8px;
  margin-top: 2px;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
}

.message-text {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
}

.message-data {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  margin-top: 4px;
  word-break: break-all;
  white-space: pre-wrap;
  background: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

.no-messages {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  color: rgba(0, 0, 0, 0.45);
}

/* 不同类型消息的样式 */
.message-info {
  background-color: #e6f7ff;
  border-left: 3px solid #1677ff;
}

.message-info .message-icon {
  color: #1677ff;
}

.message-success {
  background-color: #f6ffed;
  border-left: 3px solid #52c41a;
}

.message-success .message-icon {
  color: #52c41a;
}

.message-warning {
  background-color: #fffbe6;
  border-left: 3px solid #faad14;
}

.message-warning .message-icon {
  color: #faad14;
}

.message-error {
  background-color: #fff2f0;
  border-left: 3px solid #ff4d4f;
}

.message-error .message-icon {
  color: #ff4d4f;
}

.message-progress {
  background-color: #f0f5ff;
  border-left: 3px solid #2f54eb;
}

.message-progress .message-icon {
  color: #2f54eb;
}
</style>
