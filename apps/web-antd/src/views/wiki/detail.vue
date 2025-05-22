<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Menu, Spin } from 'ant-design-vue';
import { VbenScrollbar, VbenIcon } from '@vben-core/shadcn-ui';
import {知识库VM, type 文档, getWikiDetail} from '#/api/wiki/wiki';

const route = useRoute();
const router = useRouter();
const wikiId = route.params.id as string;
const loading = ref(true);
const wiki = ref<知识库VM | null>(null);
const selectedDocId = ref<string[]>([]);
const currentDocUrl = ref('');

// 获取知识库详情
const fetchWikiDetail = async () => {
  try {
    loading.value = true;

    // 从路由的state中获取知识库信息
    if (route.params?.id) {
      wiki.value = await getWikiDetail(route.params.id as string);
    } else {
      // 如果没有从路由获取到，则需要通过API重新获取
      // 这里是模拟数据，实际项目中需要替换为真实API调用
      wiki.value = new 知识库VM({
        id: wikiId,
        名称: route.query.name as string || 'Wiki项目',
        简介: '这是一个Wiki项目的详细描述',
        URL: 'https://example.com',
        类型: '开源',
        作者: {
          uid: '123',
          username: '未知作者'
        },
        生成时间: Date.now(),
        更新时间: Date.now(),
        收藏数: 0,
        文档列表: [
          {
            id: 'd1',
            title: '介绍',
            path: 'introduction'
          },
          {
            id: 'd2',
            title: '快速开始',
            path: 'quick-start'
          }
        ],
        status: 'ready'
      });
    }

    // 如果有文档，默认选中第一个
    if (wiki.value?.文档列表?.length > 0) {
      selectedDocId.value = [wiki.value.文档列表[0]?.id || ''];
      loadDocument(wiki.value.文档列表[0]);
    }

    loading.value = false;
  } catch (error) {
    console.error('获取知识库详情失败:', error);
    loading.value = false;
  }
};

// 处理文档选择
const handleDocSelect = (info: { key: string }) => {
  const doc = wiki.value?.文档列表.find(d => d.id === info.key);
  if (doc) {
    loadDocument(doc);
  }
};

// 加载文档内容
const loadDocument = (doc?: 文档) => {
  // 如果doc为null或undefined，不执行任何操作
  if (!doc) return;

  // 构建Vitepress文档URL
  // 实际项目中需要替换为真实的Vitepress URL
  // currentDocUrl.value = `http://localhost:5173/${wikiId}/${doc.path}`;
  currentDocUrl.value = 'http://localhost:5173/';
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
              @click="handleDocSelect"
            >
              <Menu.Item v-for="doc in wiki.文档列表" :key="doc.id">
                {{ doc.title }}
              </Menu.Item>
            </Menu>
          </VbenScrollbar>
        </div>

        <!-- 右侧内容区：iframe加载Vitepress内容 -->
        <div class="wiki-content">
          <iframe
            v-if="currentDocUrl"
            :src="currentDocUrl"
            frameborder="0"
            class="wiki-iframe"
          ></iframe>
          <div v-else class="wiki-empty">
            请选择左侧文档进行查看
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
</style>
