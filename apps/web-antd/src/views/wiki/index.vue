<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Card, Input, Select, Button, Pagination } from 'ant-design-vue';
import { VbenIcon } from '@vben-core/shadcn-ui';
import { getWikiList, type 知识库VM } from '#/api/wiki/wiki';

const router = useRouter();
const searchText = ref('');
const typeFilter = ref('');
const currentPage = ref(1);
const pageSize = ref(12);
const totalWikis = ref(0);
const wikiList = ref<知识库VM[]>([]);

// 获取知识库数据
const fetchWikiList = async () => {
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    };

    // 调用API获取真实数据
    const { data, total } = await getWikiList(params);
    wikiList.value = data;
    totalWikis.value = total;
  } catch (error) {
    console.error('获取知识库列表失败:', error);
  }
};

// 导航到知识库详情页
const navigateToWikiDetail = (item: 知识库VM) => {
  router.push({
    name: 'WikiDetail',
    query: { name: item.名称 },
    params: { id: item.id }
  });
};

onMounted(() => {
  fetchWikiList();
});
</script>

<template>
  <div class="wiki-home">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>知识库首页</h1>
      <p class="description">浏览由AIGC生成的开源、企业项目wiki页面</p>
    </div>

    <!-- 搜索和过滤区域 -->
    <div class="search-bar">
      <Input
        placeholder="搜索知识库..."
        v-model:value="searchText"
        class="search-input"
      />
      <Select
        placeholder="类型筛选"
        v-model:value="typeFilter"
        class="type-filter"
      >
        <Select.Option value="开源">开源</Select.Option>
        <Select.Option value="企业">企业</Select.Option>
        <Select.Option value="个人">个人</Select.Option>
        <Select.Option value="其他">其他</Select.Option>
      </Select>
      <Button type="primary" @click="fetchWikiList">搜索</Button>
    </div>

    <!-- 知识库卡片列表 -->
    <div class="wiki-cards">
      <Card
        v-for="item in wikiList"
        :key="item.id"
        class="wiki-card"
        hoverable
        @click="navigateToWikiDetail(item)"
      >
        <div class="card-header">
          <VbenIcon
            :icon="item.icon"
            class="card-icon"
          />
          <span class="card-title">{{ item.名称 }}</span>
        </div>
        <div class="card-content">
          {{ item.简介 }}
        </div>
        <div class="card-footer">
          <span>{{ item.类型 }}</span>
          <span>{{ item.收藏数 }} 收藏</span>
          <span>{{ item.更新时间Str }}</span>
        </div>
      </Card>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <Pagination
        v-model:current="currentPage"
        v-model:pageSize="pageSize"
        :total="totalWikis"
        @change="fetchWikiList"
      />
    </div>
  </div>
</template>

<style scoped>
.wiki-home {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.description {
  color: rgba(0, 0, 0, 0.45);
}

.search-bar {
  display: flex;
  margin-bottom: 24px;
  gap: 12px;
}

.search-input {
  width: 300px;
}

.type-filter {
  width: 150px;
}

.wiki-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.wiki-card {
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 24px;
  margin-right: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
}

.card-content {
  height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 12px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
}
</style>
