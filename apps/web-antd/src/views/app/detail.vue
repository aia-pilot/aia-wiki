<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Card, Tag, Button, Spin, Tabs, Statistic, Divider, message } from 'ant-design-vue';
import { VbenIcon } from '@vben-core/shadcn-ui';
import { type 智能应用VM, getAppDetail, updateApp } from '#/api/app/app';

const route = useRoute();
const router = useRouter();
const appId = route.params.id as string;
const loading = ref(true);
const app = ref<智能应用VM | null>(null);
const cpContent = ref(''); // CP文件内容
const isFavorite = ref(false);

// 获取智能应用详情
const fetchAppDetail = async () => {
  try {
    loading.value = true;

    // 从路由参数中获取应用ID
    if (route.params?.id) {
      const appData = await getAppDetail(route.params.id as string);
      app.value = appData;
    } else {
      router.push('/app'); // 如果没有ID，重定向到应用列表页
      return;
    }

    // 加载CP文件内容（实际项目中需要通过API获取）
    loadCpContent();

    loading.value = false;
  } catch (error) {
    console.error('获取智能应用详情失败:', error);
    message.error('获取应用详情失败，请重试');
    loading.value = false;
  }
};

// 加载CP文件内容
const loadCpContent = async () => {
  // 这里应该是通过API获取文件内容
  // 示例代码使用模拟内容
  cpContent.value = `// 认知程序示例内容
function 处理用户输入(用户输入) {
  if (用户输入.包含('你好')) {
    return '您好！我是由认知程序驱动的智能应用，很高兴为您服务。';
  }

  if (用户输入.包含('帮助')) {
    return '我可以回答问题、提供建议、执行任务等。请告诉我您需要什么帮助？';
  }

  return '我理解您的输入是：' + 用户输入 + '。请告诉我更多细节，我才能更好地帮助您。';
}

// 模块导出
module.exports = {
  名称: '${app.value?.名称 || "示例应用"}',
  处理用户输入
}`;
};

// 收藏应用
const toggleFavorite = async () => {
  if (!app.value) return;

  try {
    isFavorite.value = !isFavorite.value;
    const newCount = isFavorite.value ? (app.value.收藏数 + 1) : (app.value.收藏数 - 1);

    // 调用API更新收藏数
    const success = await updateApp(app.value.id, { 收藏数: newCount });

    if (success) {
      if (app.value) {
        app.value.收藏数 = newCount;
      }
      message.success(isFavorite.value ? '已收藏' : '已取消收藏');
    } else {
      isFavorite.value = !isFavorite.value; // 恢复状态
      message.error('操作失败，请重试');
    }
  } catch (error) {
    console.error('收藏操作失败:', error);
    isFavorite.value = !isFavorite.value; // 恢复状态
    message.error('操作失败，请重试');
  }
};

// 运行应用
const runApplication = () => {
  if (!app.value) return;

  message.info('正在启动应用...');

  // 实际项目中，这里应该跳转到应用运行页面或打开应用窗口
  setTimeout(() => {
    router.push(`/app/${app.value?.id}/run`);
  }, 1000);
};

// 分享应用
const shareApplication = () => {
  if (!app.value) return;

  // 复制分享链接到剪贴板
  const shareLink = `${window.location.origin}/app/${app.value.id}`;
  navigator.clipboard.writeText(shareLink).then(() => {
    message.success('链接已复制到剪贴板');
  });
};

// 返回到应用列表页
const goBack = () => {
  router.push('/app');
};

onMounted(() => {
  fetchAppDetail();
});
</script>

<template>
  <div class="app-detail-container">
    <Spin :spinning="loading" class="app-detail-spinner">
      <div class="app-detail" v-if="app">
        <!-- 返回按钮 -->
        <div class="back-button" @click="goBack">
          <VbenIcon icon="carbon:arrow-left" />
          返回应用列表
        </div>

        <!-- 应用头部信息 -->
        <div class="app-header">
          <div class="app-title-section">
            <VbenIcon :icon="app.icon" class="app-icon" />
            <div class="app-title-info">
              <h1>{{ app.名称 }}</h1>
              <div class="app-tags">
                <Tag v-for="tag in app.tags" :key="tag" color="blue">{{ tag }}</Tag>
                <Tag :color="app.status === 'ready' ? 'green' : app.status === 'creating' ? 'orange' : 'red'">
                  {{ app.status === 'ready' ? '已就绪' : app.status === 'creating' ? '创建中' : '已弃用' }}
                </Tag>
              </div>
            </div>
          </div>
          <div class="app-actions">
            <Button
              type="primary"
              :disabled="app.status !== 'ready'"
              @click="runApplication"
            >
              <VbenIcon icon="carbon:play" />
              运行应用
            </Button>
            <Button
              :type="isFavorite ? 'default' : 'dashed'"
              @click="toggleFavorite"
            >
              <VbenIcon :icon="isFavorite ? 'carbon:favorite-filled' : 'carbon:favorite'" />
              {{ isFavorite ? '已收藏' : '收藏' }}
            </Button>
            <Button @click="shareApplication">
              <VbenIcon icon="carbon:share" />
              分享
            </Button>
          </div>
        </div>

        <!-- 应用详情内容 -->
        <div class="app-content">
          <Tabs defaultActiveKey="1">
            <Tabs.TabPane key="1" tab="应用简介">
              <Card class="app-info-card">
                <p class="app-description">{{ app.简介 }}</p>
                <Divider />
                <div class="app-meta">
                  <div class="meta-item">
                    <span class="meta-label">作者：</span>
                    <span>{{ app.作者.username }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">创建时间：</span>
                    <span>{{ new Date(app.生成时间).toLocaleString() }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">更新时间：</span>
                    <span>{{ new Date(app.更新时间).toLocaleString() }}</span>
                  </div>
                </div>

                <div class="app-statistics">
                  <Statistic title="收藏数" :value="app.收藏数" />
                  <Statistic title="使用次数" :value="app.使用次数" />
                  <Statistic title="共享成果总数" :value="app.共享成果总数" />
                </div>
              </Card>
            </Tabs.TabPane>

            <Tabs.TabPane key="2" tab="CP源码">
              <Card class="cp-code-card">
                <pre class="cp-code">{{ cpContent }}</pre>
              </Card>
            </Tabs.TabPane>

            <Tabs.TabPane key="3" tab="使用示例">
              <Card class="usage-examples-card">
                <h3>基本用法</h3>
                <p>该应用可以通过以下方式使用：</p>
                <ol>
                  <li>点击"运行应用"按钮直接启动</li>
                  <li>通过API接口集成到您自己的系统中</li>
                  <li>在命令行中通过CP引擎运行</li>
                </ol>

                <h3>示例对话</h3>
                <div class="example-dialog">
                  <div class="dialog-item user">
                    <span class="dialog-content">你好</span>
                  </div>
                  <div class="dialog-item app">
                    <span class="dialog-content">您好！我是由认知程序驱动的智能应用，很高兴为您服务。</span>
                  </div>
                  <div class="dialog-item user">
                    <span class="dialog-content">我需要帮助</span>
                  </div>
                  <div class="dialog-item app">
                    <span class="dialog-content">我可以回答问题、提供建议、执行任务等。请告诉我您需要什么帮助？</span>
                  </div>
                </div>
              </Card>
            </Tabs.TabPane>
          </Tabs>
        </div>
      </div>

      <div v-else class="app-not-found">
        <VbenIcon icon="carbon:warning" class="warning-icon" />
        <h2>应用不存在或已被删除</h2>
        <Button type="primary" @click="goBack">返回应用列表</Button>
      </div>
    </Spin>
  </div>
</template>

<style scoped>
.app-detail-container {
  padding: 20px;
  background-color: #f0f2f5;
  min-height: 100vh;
}

.app-detail-spinner {
  width: 100%;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1890ff;
  cursor: pointer;
  margin-bottom: 16px;
  font-size: 14px;
}

.back-button:hover {
  text-decoration: underline;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.app-title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-icon {
  font-size: 48px;
  color: #1890ff;
}

.app-title-info h1 {
  margin-bottom: 8px;
  font-size: 24px;
}

.app-tags {
  display: flex;
  gap: 8px;
}

.app-actions {
  display: flex;
  gap: 12px;
}

.app-content {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.app-info-card, .cp-code-card, .usage-examples-card {
  width: 100%;
}

.app-description {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.app-meta {
  margin-bottom: 20px;
}

.meta-item {
  margin-bottom: 8px;
}

.meta-label {
  font-weight: 500;
  margin-right: 8px;
}

.app-statistics {
  display: flex;
  justify-content: space-around;
  margin-top: 24px;
  text-align: center;
}

.cp-code {
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', Courier, monospace;
  line-height: 1.5;
}

.example-dialog {
  margin-top: 16px;
}

.dialog-item {
  margin-bottom: 16px;
  display: flex;
}

.dialog-item.user {
  justify-content: flex-end;
}

.dialog-content {
  padding: 10px 16px;
  border-radius: 8px;
  max-width: 70%;
}

.dialog-item.user .dialog-content {
  background-color: #1890ff;
  color: white;
}

.dialog-item.app .dialog-content {
  background-color: #f0f0f0;
  color: #333;
}

.app-not-found {
  text-align: center;
  padding: 60px 0;
}

.warning-icon {
  font-size: 64px;
  color: #ff4d4f;
  margin-bottom: 24px;
}
</style>
