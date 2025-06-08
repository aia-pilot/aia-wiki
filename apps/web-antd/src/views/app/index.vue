<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Card, Input, Select, Button, Pagination, Modal, Form, message, Tag } from 'ant-design-vue';
import { VbenIcon } from '@vben-core/shadcn-ui';
import { getAppList, createApp, type 智能应用VM } from '#/api/app/app';
import FileDirSelector from '#/components/FileDirSelector.vue';
import type { ElectronDragAndDropOptions } from '#/directives/electron-drag-and-drop';

const router = useRouter();
const searchText = ref('');
const tagFilter = ref('');
const currentPage = ref(1);
const pageSize = ref(12);
const totalApps = ref(0);
const appList = ref<智能应用VM[]>([]);

// 创建应用相关状态
const showCreateModal = ref(false);
const createFormRef = ref();
const createLoading = ref(false);
const createFormState = ref({
  名称: '',
  简介: '',
  tags: [] as string[],
  CP文件路径: ''
});

// 拖拽状态
const isDragging = ref(false);

// 获取智能应用数据
const fetchAppList = async () => {
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    };

    // 调用API获取实际数据
    const { data, total } = await getAppList(params);
    appList.value = data;
    totalApps.value = total;
  } catch (error) {
    console.error('获取智能应用列表失败:', error);
    message.error('获取应用列表失败，请重试');
  }
};

// 导航到智能应用详情页
const navigateToAppDetail = (item: 智能应用VM) => {
  router.push({
    name: 'AppDetail',
    query: { name: item.名称 },
    params: { id: item.id }
  });
};

// 打开创建智能应用弹窗
const openCreateModal = (cpFilePath?: string) => {
  showCreateModal.value = true;

  // 如果提供了CP文件路径，自动填充到表单
  if (cpFilePath) {
    createFormState.value.CP文件路径 = cpFilePath;
    // 从路径中提取文件名作为应用名称建议
    const fileName = cpFilePath.split('/').pop() || '';
    const appName = fileName.replace('.cp', '');
    createFormState.value.名称 = appName;
  }
};

// 关闭创建智能应用弹窗
const closeCreateModal = () => {
  showCreateModal.value = false;
  createFormRef.value?.resetFields();
};

// 添加标签
const handleAddTag = () => {
  const input = document.getElementById('tagInput') as HTMLInputElement;
  const tag = input.value.trim();
  if (tag && !createFormState.value.tags.includes(tag)) {
    createFormState.value.tags.push(tag);
  }
  input.value = '';
};

// 删除标签
const handleRemoveTag = (removedTag: string) => {
  createFormState.value.tags = createFormState.value.tags.filter(tag => tag !== removedTag);
};

// 提交创建智能应用表单
const handleCreateSubmit = async () => {
  try {
    await createFormRef.value.validate();
    createLoading.value = true;

    // 调用创建智能应用接口
    const newApp = await createApp(createFormState.value);

    message.success('智能应用创建成功');
    closeCreateModal();

    // 导航到详情页
    navigateToAppDetail(newApp);

  } catch (error) {
    console.error('创建智能应用失败:', error);
    message.error('创建智能应用失败，请重试');
  } finally {
    createLoading.value = false;
  }
};

// 处理CP文件拖拽
const handleDrop = ({ isDirectory, filePath }: {isDirectory: boolean, filePath: string}) => {
  isDragging.value = false;
  if (!isDirectory && filePath && filePath.endsWith('.cp')) {
    // 如果有拖拽的CP文件路径，直接打开创建弹窗
    openCreateModal(filePath);
    return;
  }
  // 如果没有拖拽的路径，提示用户
  message.info('请拖拽一个CP文件到此处');
};

// 处理拖拽悬停事件
const handleDragOver = () => {
  isDragging.value = true;
};

// 处理拖拽离开事件
const handleDragLeave = () => {
  isDragging.value = false;
};

// 拖拽指令配置
const ElectronDragAndDropOptions: ElectronDragAndDropOptions = {
  onDrop: handleDrop,
  onDragOver: handleDragOver,
  onDragLeave: handleDragLeave
};

// 处理CP文件选择
const handleFileDirSelected = (selectedPath: string) => {
  if (selectedPath && selectedPath.endsWith('.cp')) {
    createFormState.value.CP文件路径 = selectedPath;

    // 从路径中提取文件名作为应用名称建议
    const fileName = selectedPath.split('/').pop() || '';
    const appName = fileName.replace('.cp', '');
    if (!createFormState.value.名称) {
      createFormState.value.名称 = appName;
    }
  } else {
    message.warning('请选择一个有效的CP文件');
  }
};

onMounted(() => {
  fetchAppList();
});
</script>

<template>
  <div
    class="app-home"
    v-electron-drag-and-drop="ElectronDragAndDropOptions"
    :class="{'dragging': isDragging}"
  >
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>智能应用中心</h1>
      <p class="description">探索和使用由认知程序(CP)驱动的智能应用</p>
      <p class="drag-hint" v-if="isDragging">释放鼠标创建应用</p>
    </div>

    <!-- 搜索和过滤区域 -->
    <div class="search-bar">
      <Input
        placeholder="搜索应用..."
        v-model:value="searchText"
        class="search-input"
      />
      <Select
        placeholder="标签筛选"
        v-model:value="tagFilter"
        class="tag-filter"
        allowClear
      >
        <Select.Option value="AI">AI</Select.Option>
        <Select.Option value="工具">工具</Select.Option>
        <Select.Option value="助手">助手</Select.Option>
        <Select.Option value="教育">教育</Select.Option>
        <Select.Option value="开发">开发</Select.Option>
      </Select>
      <Button type="primary" @click="fetchAppList">搜索</Button>
    </div>

    <!-- 智能应用卡片列表 -->
    <div class="app-cards">
      <!-- 创建智能应用卡片 -->
      <Card class="app-card create-card" hoverable @click="openCreateModal()">
        <div class="create-content">
          <div class="create-icon">
            <VbenIcon icon="carbon:add" class="add-icon" />
          </div>
          <div class="create-text">创建智能应用</div>
          <div class="create-hint">或拖拽CP文件到此处</div>
        </div>
      </Card>

      <Card
        v-for="item in appList"
        :key="item.id"
        class="app-card"
        hoverable
        @click="navigateToAppDetail(item)"
      >
        <div class="card-header">
          <VbenIcon
            :icon="item.icon"
            class="card-icon"
          />
          <span class="card-title">{{ item.名称 }}</span>
          <Tag color="blue" v-if="item.status === 'ready'" class="status-tag">已就绪</Tag>
          <Tag color="orange" v-if="item.status === 'creating'" class="status-tag">创建中</Tag>
          <Tag color="red" v-if="item.status === 'deprecated'" class="status-tag">已弃用</Tag>
        </div>
        <div class="card-content">
          {{ item.简介 }}
        </div>
        <div class="card-tags">
          <Tag v-for="tag in item.tags" :key="tag">{{ tag }}</Tag>
        </div>
        <div class="card-footer">
          <span><VbenIcon icon="carbon:user" /> {{ item.作者.username }}</span>
          <span  title="共享成果总数 / 使用次数"><VbenIcon icon="carbon:task-complete"/>{{ item.共享成果总数 }} / {{ item.使用次数 }}</span>
          <span><VbenIcon icon="carbon:favorite" /> {{ item.收藏数 }}</span>
          <span><VbenIcon icon="carbon:timer" /> {{ item.更新时间Str }}</span>
        </div>
      </Card>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <Pagination
        v-model:current="currentPage"
        v-model:pageSize="pageSize"
        :total="totalApps"
        @change="fetchAppList"
      />
    </div>

    <!-- 创建智能应用弹窗 -->
    <Modal
      v-model:visible="showCreateModal"
      title="创建新智能应用"
      @cancel="closeCreateModal"
      :footer="null"
      :maskClosable="false"
      width="600px"
    >
      <Form
        ref="createFormRef"
        :model="createFormState"
        layout="vertical"
      >
        <Form.Item
          name="名称"
          label="应用名称"
          :rules="[{ required: true, message: '请输入应用名称' }]"
        >
          <Input v-model:value="createFormState.名称" placeholder="请输入应用名称" />
        </Form.Item>

        <Form.Item
          name="CP文件路径"
          label="CP文件路径"
          :rules="[{ required: true, message: '请输入CP文件路径' }]"
        >
          <FileDirSelector
            v-model:value="createFormState.CP文件路径"
            @select="handleFileDirSelected"
            placeholder="选择或输入CP文件路径"
            buttonText="浏览..."
            dialogTitle="选择CP文件"
            :dialogOptions="{
              properties: ['openFile'],
              filters: [
                { name: '认知程序文件', extensions: ['cp'] }
              ]
            }"
          />
        </Form.Item>

        <Form.Item
          name="简介"
          label="应用简介"
          :rules="[{ required: true, message: '请输入应用简介' }]"
        >
          <Input.TextArea
            v-model:value="createFormState.简介"
            placeholder="请简要描述该应用的功能和用途"
            :rows="4"
            :maxlength="200"
            show-count
          />
        </Form.Item>

        <Form.Item
          name="tags"
          label="标签"
        >
          <div class="tag-input-container">
            <Input id="tagInput" placeholder="输入标签，按回车添加" @keypress.enter="handleAddTag" />
            <Button @click="handleAddTag">添加</Button>
          </div>
          <div class="tags-container">
            <Tag
              v-for="tag in createFormState.tags"
              :key="tag"
              closable
              @close="handleRemoveTag(tag)"
            >
              {{ tag }}
            </Tag>
          </div>
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
.app-home {
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

.tag-filter {
  width: 150px;
}

.app-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.app-card {
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
  flex-shrink: 0;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-tag {
  margin-left: 8px;
}

.card-content {
  height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-tags {
  margin-bottom: 12px;
  min-height: 30px;
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

.tag-input-container {
  display: flex;
  gap: 8px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.browse-button {
  position: absolute;
  right: 0;
  top: 0;
  z-index: 1;
}
</style>
