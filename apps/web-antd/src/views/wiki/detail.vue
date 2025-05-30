<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Menu, Spin, Button } from 'ant-design-vue';
import { VbenScrollbar, VbenIcon } from '@vben-core/shadcn-ui';
import { useTabs } from '@vben/hooks';
import {知识库VM, type 文档, getWikiDetail} from '#/api/wiki/wiki';


const { closeCurrentTab } = useTabs();
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const wiki = ref<知识库VM | null>(null);
const selectedDocId = ref<string[]>([]);
const currentDocUrl = ref('');

// 获取知识库详情
const fetchWikiDetail = async () => {
  try {
    loading.value = true;
    wiki.value = await getWikiDetail(route.params.id as string);
    // 如果有文档，默认选中第一个
    if (wiki.value?.文档列表?.length > 0) {
      selectedDocId.value = [wiki.value.文档列表[0]?.id || wiki.value.文档列表[0]?.title || ''];
      loadDocument(wiki.value.文档列表[0]);
    }

    loading.value = false;
  } catch (error) {
    console.error('获取知识库详情失败:', error);
    loading.value = false;
  }
};

// // 处理文档选择
const handleDocSelect = (idOrTitle: string) => {
  const doc = wiki.value?.文档列表.find(d => d.id === idOrTitle || d.title === idOrTitle);
  if (doc) {
    loadDocument(doc);
  }
};



// 加载文档内容
const WIKI_ROOT = import.meta.env.VITE_AIA_WIKI_VITEPRESS_URL;
const loadDocument = (doc?: 文档) => {
  // 如果doc为null或undefined，不执行任何操作
  if (!doc) return;

  // 构建Vitepress文档URL，拼接wiki.根目录、文档路径和Vitepress根URL
  console.log('加载文档:', doc, wiki.value);
  // @ts-ignore
  currentDocUrl.value = `${WIKI_ROOT}/${wiki.value?.根目录}/${doc.path.replace(/.md$/, '')}`;
  console.log('当前文档URL:', currentDocUrl.value);
  // currentDocUrl.value = `http://localhost:5173/${wikiId}/${doc.path}`;
  // currentDocUrl.value = import.meta.env.VITE_AIA_WIKI_VITEPRESS_URL;
};

// 返回到知识库首页
const goBack = () => {
  router.push('/wiki');
};

onMounted(() => {
  fetchWikiDetail();
});
</script>

<template>
  <div class="wiki-detail-container">
    <Spin :spinning="loading" class="wiki-detail-spinner">
      <div class="wiki-detail">
        <!-- 左侧边栏：文档列表 -->
        <div class="wiki-sidebar" v-if="wiki">
          <div class="wiki-info">
            <div class="back-button" @click="goBack">
              <VbenIcon icon="carbon:arrow-left" />
              返回
            </div>
            <div class="wiki-header">
              <VbenIcon
                :icon="wiki.icon"
                class="wiki-type-icon"
              />
              <h2>{{ wiki.名称 }}</h2>
            </div>
            <p class="wiki-desc">{{ wiki.简介 }}</p>
            <div class="wiki-meta">
              <span>作者: {{ wiki.作者.username }}</span>
              <span>更新时间: {{ wiki.更新时间Str }}</span>
              <span>收藏数: {{ wiki.收藏数 }}</span>
            </div>
          </div>

          <!-- 文档列表 -->
          <div class="docs-title">文档列表</div>
          <VbenScrollbar>
            <Menu
              v-model:selectedKeys="selectedDocId"
              mode="inline"
            >
              <Menu.Item v-for="doc in wiki.文档列表" :key="doc.id || doc.title" @click="handleDocSelect(doc.id || doc.title)">
                {{ doc.title }}
              </Menu.Item>
            </Menu>
          </VbenScrollbar>
        </div>

        <!-- 右侧内容区：根据状态显示不同内容 -->
        <div class="wiki-content">
          <!-- 创建中状态 -->
          <div v-if="wiki?.isCreating" class="wiki-status-container creating">
            <Spin tip="知识库创建中，请稍候..." :spinning="true">
              <div class="status-message">
                <VbenIcon icon="carbon:time" class="status-icon" />
                <p>正在处理知识库数据，这可能需要一些时间。</p>
                <p class="sub-message">您无需刷新页面，状态会自动更新。</p>
              </div>
            </Spin>
          </div>

          <!-- 创建失败状态 -->
          <div v-else-if="wiki?.isFailed" class="wiki-status-container failed">
            <div class="status-message">
              <VbenIcon icon="carbon:warning" class="status-icon" />
              <p>知识库创建失败</p>
              <p class="sub-message">请尝试重新创建或联系管理员。</p>
              <Button type="primary" @click="closeCurrentTab()">关闭</Button>
            </div>
          </div>

          <!-- 准备就绪状态 - 显示文档内容 -->
          <template v-else-if="wiki?.isReady">
            <iframe
              v-if="currentDocUrl"
              :src="currentDocUrl"
              frameborder="0"
              class="wiki-iframe"
            ></iframe>
            <div v-else class="wiki-empty">
              请选择左侧文档进行查看
            </div>
          </template>

          <!-- 未知状态或加载中 -->
          <div v-else class="wiki-status-container">
            <Spin :spinning="true">
              <div class="status-message">
                <p>加载中...</p>
              </div>
            </Spin>
          </div>
        </div>
      </div>
    </Spin>
  </div>
</template>

<style scoped>
.wiki-detail-container {
  width: 100%;
  height: 100%;
}

.wiki-detail {
  display: flex;
  width: 100%;
  height: calc(100vh - 60px); /* 减去顶部导航高度 */
  position: relative;
}

.wiki-detail-spinner {
  width: 100%;
  height: 100%;
}

.wiki-sidebar {
  width: 280px;
  min-width: 280px; /* 确保不会被挤压 */
  height: 100%;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  z-index: 10;
}

.wiki-info {
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.back-button {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #1677ff;
  cursor: pointer;
  margin-bottom: 12px;
}

.back-button:hover {
  text-decoration: underline;
}

.wiki-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.wiki-type-icon {
  font-size: 20px;
  margin-right: 8px;
}

.wiki-info h2 {
  margin: 0;
  font-size: 18px;
}

.wiki-desc {
  margin: 8px 0 12px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 14px;
}

.wiki-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.docs-title {
  padding: 12px 16px;
  font-weight: 500;
  border-bottom: 1px solid #e8e8e8;
}

.wiki-content {
  flex: 1;
  height: 100%;
  overflow: hidden;
  position: relative;
  background-color: #fff;
}

.wiki-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.wiki-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 16px;
  color: rgba(0, 0, 0, 0.45);
  text-align: center;
  padding: 20px;
  background-color: #f0f2f5;
  border-radius: 4px;
}

/* 状态容器样式 */
.wiki-status-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
}

.status-message {
  margin-top: 20px;
  max-width: 500px;
}

.status-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.wiki-status-container p {
  font-size: 16px;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.85);
}

.sub-message {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.45);
}

/* 创建中状态特有样式 */
.wiki-status-container.creating .status-icon {
  color: #1677ff;
}

/* 创建失败状态特有样式 */
.wiki-status-container.failed .status-icon {
  color: #ff4d4f;
}
</style>
