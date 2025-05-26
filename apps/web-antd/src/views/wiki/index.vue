<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Card, Input, Select, Button, Pagination, Modal, Form, message } from 'ant-design-vue';
import { VbenIcon } from '@vben-core/shadcn-ui';
import { getWikiList, createWiki, type 知识库VM } from '#/api/wiki/wiki';

const router = useRouter();
const searchText = ref('');
const typeFilter = ref('');
const currentPage = ref(1);
const pageSize = ref(12);
const totalWikis = ref(0);
const wikiList = ref<知识库VM[]>([]);

// 创建知识库相关状态
const showCreateModal = ref(false);
const createFormRef = ref();
const createLoading = ref(false);
const createFormState = ref({
  名称: '',
  URL: '',
  类型: '开源',
  简介: ''
});

// 拖拽状态
const isDragging = ref(false);
const dropAreaRef = ref<HTMLElement | null>(null);

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

// 打开创建知识库弹窗
const openCreateModal = (folderPath?: string) => {
  showCreateModal.value = true;

  // 如果提供了文件夹路径，自动填充到表单
  if (folderPath) {
    createFormState.value.URL = folderPath;
    // 从路径中提取文件夹名称作为知识库名称
    const folderName = folderPath.split('/').pop() || '';
    createFormState.value.名称 = folderName;
  }
};

// 关闭创建知识库弹窗
const closeCreateModal = () => {
  showCreateModal.value = false;
  createFormRef.value?.resetFields();
};

// 提交创建知识库表单
const handleCreateSubmit = async () => {
  try {
    await createFormRef.value.validate();
    createLoading.value = true;

    // 调用创建知识库接口
    // @ts-ignore
    const newWiki = await createWiki(createFormState.value);

    message.success('知识库创建成功，正在生成文档...');
    closeCreateModal();

    // 导航到详情页
    navigateToWikiDetail(newWiki);

  } catch (error) {
    console.error('创建知识库失败:', error);
    message.error('创建知识库失败，请重试');
    createLoading.value = false;
  }
};

// 处理拖拽事件
const handleDrop = ({ isDirectory, filePath }: {isDirectory: boolean, filePath: string}) => {
  isDragging.value = false;
  if (isDirectory && filePath) {
    // 如果有拖拽的文件夹路径，直接打开创建弹窗
    openCreateModal(filePath);
    return;
  }
  // 如果没有拖拽的路径，提示用户
  message.info('请拖拽一个文件夹到此处');
};

onMounted(() => {
  fetchWikiList();

  // 绑定拖拽事件，由Electorn处理，获得CP文件路径
  // @ts-ignore
  if (window.electronAPI?.bindFileFolderDrop && dropAreaRef.value) {
    // @ts-ignore
    window.electronAPI.bindFileFolderDrop(dropAreaRef.value, handleDrop);
  }
});
</script>

<template>
  <div
    class="wiki-home"
    ref="dropAreaRef"
    @dragover.prevent="isDragging = true"
    @dragleave="isDragging = false"
    :class="{'dragging': isDragging}"
  >
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>知识库首页</h1>
      <p class="description">浏览由AIGC生成的开源、企业项目wiki页面</p>
      <p class="drag-hint" v-if="isDragging">释放鼠标创建知识库</p>
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
      <!-- 创建知识库卡片 -->
      <Card class="wiki-card create-card" hoverable @click="openCreateModal()">
        <div class="create-content">
          <div class="create-icon">
            <VbenIcon icon="carbon:add" class="add-icon" />
          </div>
          <div class="create-text">创建知识库</div>
          <div class="create-hint">或拖拽文件夹到此处</div>
        </div>
      </Card>

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

    <!-- 创建知识库弹窗 -->
    <Modal
      v-model:visible="showCreateModal"
      title="创建新知识库"
      @cancel="closeCreateModal"
      :footer="null"
      :maskClosable="false"
    >
      <Form
        ref="createFormRef"
        :model="createFormState"
        layout="vertical"
      >
        <Form.Item
          name="名称"
          label="知识库名称"
          :rules="[{ required: true, message: '请输入知识库名称' }]"
        >
          <Input v-model:value="createFormState.名称" placeholder="请输入知识库名称" />
        </Form.Item>

        <Form.Item
          name="URL"
          label="项目地址"
          :rules="[{ required: true, message: '请输入项目地址' }]"
        >
          <Input v-model:value="createFormState.URL" placeholder="如：https://github.com/username/repo" />
        </Form.Item>

        <Form.Item
          name="类型"
          label="知识库类型"
          :rules="[{ required: true, message: '请选择知识库类型' }]"
        >
          <Select v-model:value="createFormState.类型">
            <Select.Option value="开源">开源</Select.Option>
            <Select.Option value="企业">企业</Select.Option>
            <Select.Option value="个人">个人</Select.Option>
            <Select.Option value="其他">其他</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="简介"
          label="知识库简介"
          :rules="[{ required: true, message: '请输入知识库简介' }]"
        >
          <Input.TextArea
            v-model:value="createFormState.简介"
            placeholder="请简要描述该知识库"
            :rows="4"
            :maxlength="200"
            show-count
          />
        </Form.Item>

        <Form.Item class="form-buttons">
          <Button @click="closeCreateModal">取消</Button>
          <Button type="primary" @click="handleCreateSubmit" :loading="createLoading">创建</Button>
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.wiki-home {
  padding: 20px;
  position: relative;
  min-height: 80vh;
  transition: all 0.3s;
}

.dragging {
  background-color: rgba(24, 144, 255, 0.1);
  border: 2px dashed #1890ff;
}

.page-header {
  margin-bottom: 24px;
  position: relative;
}

.drag-hint {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  color: #1890ff;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
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

.create-card {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px dashed #d9d9d9;
  background-color: #fafafa;
  cursor: pointer;
  transition: all 0.3s;
}

.create-card:hover {
  border-color: #1890ff;
}

.create-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px 0;
}

.create-icon {
  font-size: 32px;
  color: #1890ff;
  margin-bottom: 8px;
}

.create-text {
  font-size: 16px;
  color: rgba(0, 0, 0, 0.65);
}

.create-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 8px;
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

.form-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
