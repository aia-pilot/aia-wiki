<template>
  <div class="p-4 workspace-test-container">
    <h1>FileWorkspace API 测试</h1>

    <Alert v-if="!isSupported" type="error" message="您的浏览器不支持 File System Access API，请使用基于 Chromium 的浏览器（如 Chrome 或 Edge）。" />

    <div v-else class="workspace-controls mt-4">
      <Space direction="vertical" style="width: 100%">
        <!-- 授权控制 -->
        <Card title="工作区授权" :bordered="false">
          <Space>
            <Button type="primary" @click="handlePickRoot" :disabled="busy">选择工作区目录</Button>
            <Button @click="handleRestoreRoot" :disabled="busy">恢复上次的工作区</Button>
            <Button danger @click="handleForgetRoot" :disabled="busy || !hasRoot">清除授权</Button>
          </Space>
          <div class="mt-2" v-if="hasRoot">
            <Tag color="success">工作区已授权</Tag>
          </div>
        </Card>

        <!-- 只有授权后才显示操作区域 -->
        <template v-if="hasRoot">
          <!-- 文件列表 -->
          <Card title="目录列表" :bordered="false">
            <Space>
              <Input v-model:value="listPath" placeholder="目录路径 (留空为根目录)" style="width: 300px" />
              <Button type="primary" @click="handleListDir" :disabled="busy">列出内容</Button>
            </Space>

            <Table
              v-if="fileList.length"
              :dataSource="fileList"
              :columns="fileColumns"
              size="small"
              :pagination="false"
              class="mt-2"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'actions'">
                  <Space>
                    <a v-if="record.kind === 'directory'" @click="handleOpenDir(record.path)">打开</a>
                    <a v-if="record.kind === 'file'" @click="handleReadFile(record.path)">查看</a>
                    <a @click="handleDeleteItem(record.path)">删除</a>
                  </Space>
                </template>
                <template v-if="column.key === 'size'">
                  {{ record.size ? formatBytes(record.size) : '' }}
                </template>
                <template v-if="column.key === 'lastModified'">
                  {{ record.lastModified ? formatDate(record.lastModified) : '' }}
                </template>
                <template v-if="column.key === 'name'">
                  <VbenIcon v-if="record.kind === 'directory'" icon="ant-design:folder-outlined" class="size-4" />
                  <VbenIcon v-else icon="ant-design:file-outlined" class="size-4" />
                  <span class="ml-1">{{ record.name }}</span>
                </template>
              </template>
            </Table>
            <Empty v-else-if="listPath !== null" description="目录为空" />
          </Card>

          <!-- 文件操作 -->
          <Card title="文件操作" :bordered="false">
            <Tabs v-model:activeKey="activeTab">
              <TabPane key="read" tab="读取文件">
                <Space direction="vertical" style="width: 100%">
                  <Input v-model:value="readPath" placeholder="文件路径" />
                  <Space>
                    <Button type="primary" @click="handleReadText" :disabled="busy">读取文本</Button>
                    <Button @click="handleReadBinary" :disabled="busy">读取二进制</Button>
                    <Button @click="handleSha256" :disabled="busy">计算哈希</Button>
                  </Space>
                </Space>
              </TabPane>

              <TabPane key="write" tab="写入文件">
                <Space direction="vertical" style="width: 100%">
                  <Input v-model:value="writePath" placeholder="文件路径" />
                  <Textarea v-model:value="writeContent" :rows="5" placeholder="文件内容" />
                  <Space>
                    <Button type="primary" @click="handleWriteText" :disabled="busy">写入文本</Button>
                    <Checkbox v-model:checked="createParents">自动创建父目录</Checkbox>
                    <Checkbox v-model:checked="usePrecondition">使用乐观并发控制</Checkbox>
                  </Space>
                </Space>
              </TabPane>

              <TabPane key="dir" tab="目录操作">
                <Space direction="vertical" style="width: 100%">
                  <Input v-model:value="dirPath" placeholder="目录路径" />
                  <Space>
                    <Button type="primary" @click="handleEnsureDir" :disabled="busy">创建目录</Button>
                    <Button @click="handleWalkDir" :disabled="busy">递归遍历</Button>
                  </Space>
                </Space>
              </TabPane>

              <TabPane key="move" tab="移动/重命名">
                <Space direction="vertical" style="width: 100%">
                  <Input v-model:value="moveSrc" placeholder="源路径" />
                  <Input v-model:value="moveDest" placeholder="目标路径" />
                  <Space>
                    <Button type="primary" @click="handleMove" :disabled="busy">移动/重命名</Button>
                    <Checkbox v-model:checked="moveCreateParents">自动创建父目录</Checkbox>
                  </Space>
                </Space>
              </TabPane>

              <TabPane key="stat" tab="查看状态">
                <Space direction="vertical" style="width: 100%">
                  <Input v-model:value="statPath" placeholder="文件/目录路径" />
                  <Button type="primary" @click="handleStat" :disabled="busy">获取状态</Button>
                </Space>
              </TabPane>
            </Tabs>
          </Card>

          <!-- 结果显示 -->
          <Card title="操作结果" :bordered="false">
            <Alert v-if="error" type="error" :message="error" />
            <div v-if="result">
              <div v-if="typeof result === 'string'">
                <pre class="result-pre">{{ result }}</pre>
              </div>
              <div v-else>
                <pre class="result-pre">{{ JSON.stringify(result, null, 2) }}</pre>
              </div>
              <div v-if="hashResult" class="mt-2">
                <Tag color="blue">{{ hashResult }}</Tag>
              </div>
            </div>
          </Card>
        </template>
      </Space>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { FileWorkspace } from '#/utils/fs-access-workspace';
import {
  Button, Space, Input, Card, Table, Tag, Alert, Tabs,
  TabPane, Textarea, Empty, Checkbox
} from 'ant-design-vue';
import {VbenIcon} from "@vben-core/shadcn-ui";

const isSupported = ref(true);
const workspace = ref<FileWorkspace | null>(null);
const hasRoot = ref(false);
const busy = ref(false);
const error = ref('');
const result = ref<any>(null);
const hashResult = ref('');

// 表格相关
const fileList = ref<any[]>([]);
const fileColumns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'kind', key: 'kind' },
  { title: '大小', dataIndex: 'size', key: 'size' },
  { title: '修改时间', dataIndex: 'lastModified', key: 'lastModified' },
  { title: '操作', key: 'actions' }
];

// 路径输入
const listPath = ref<string>('');
const readPath = ref<string>('');
const writePath = ref<string>('');
const writeContent = ref<string>('');
const dirPath = ref<string>('');
const moveSrc = ref<string>('');
const moveDest = ref<string>('');
const statPath = ref<string>('');

// 选项
const activeTab = ref<string>('read');
const createParents = ref<boolean>(true);
const usePrecondition = ref<boolean>(false);
const moveCreateParents = ref<boolean>(true);

onMounted(async () => {
  try {
    if (!('showDirectoryPicker' in window)) {
      isSupported.value = false;
      return;
    }

    workspace.value = new FileWorkspace();

    // 尝试恢复上次的工作区
    try {
      const restored = await workspace.value.restoreRoot();
      if (restored) {
        hasRoot.value = true;
      }
    } catch (e) {
      console.warn('Failed to restore workspace:', e);
    }
  } catch (e) {
    isSupported.value = false;
  }
});

// 授权相关操作
async function handlePickRoot() {
  error.value = '';
  result.value = null;
  busy.value = true;

  try {
    await workspace.value!.pickRoot();
    hasRoot.value = true;
  } catch (e: any) {
    error.value = `选择目录失败: ${e.message}`;
  } finally {
    busy.value = false;
  }
}

async function handleRestoreRoot() {
  error.value = '';
  result.value = null;
  busy.value = true;

  try {
    const restored = await workspace.value!.restoreRoot();
    if (restored) {
      hasRoot.value = true;
      result.value = '工作区授权恢复成功';
    } else {
      error.value = '找不到已保存的工作区授权';
    }
  } catch (e: any) {
    error.value = `恢复授权失败: ${e.message}`;
  } finally {
    busy.value = false;
  }
}

async function handleForgetRoot() {
  error.value = '';
  result.value = null;
  busy.value = true;

  try {
    await workspace.value!.forgetRoot();
    hasRoot.value = false;
    result.value = '已清除工作区授权';
    fileList.value = [];
  } catch (e: any) {
    error.value = `清除授权失败: ${e.message}`;
  } finally {
    busy.value = false;
  }
}

// 目录操作
async function handleListDir() {
  error.value = '';
  result.value = null;
  busy.value = true;

  try {
    fileList.value = await workspace.value!.list(listPath.value);
    result.value = `列出了 ${fileList.value.length} 个项目`;
  } catch (e: any) {
    error.value = `列出目录失败: ${e.message}`;
    fileList.value = [];
  } finally {
    busy.value = false;
  }
}

async function handleOpenDir(path: string) {
  listPath.value = path;
  await handleListDir();
}

// 文件读取
async function handleReadText() {
  error.value = '';
  result.value = null;
  hashResult.value = '';
  busy.value = true;

  try {
    const { content, hash } = await workspace.value!.readText(readPath.value);
    result.value = content;
    hashResult.value = hash;
  } catch (e: any) {
    error.value = `读取文本失败: ${e.message}`;
  } finally {
    busy.value = false;
  }
}

async function handleReadBinary() {
  error.value = '';
  result.value = null;
  hashResult.value = '';
  busy.value = true;

  try {
    const { content, hash } = await workspace.value!.readBinary(readPath.value);
    result.value = `读取成功，二进制数据长度: ${content.byteLength} 字节`;
    hashResult.value = hash;
  } catch (e: any) {
    error.value = `读取二进制失败: ${e.message}`;
  } finally {
    busy.value = false;
  }
}

async function handleSha256() {
  error.value = '';
  result.value = null;
  hashResult.value = '';
  busy.value = true;

  try {
    const hash = await workspace.value!.sha256(readPath.value);
    result.value = '计算哈希成功';
    hashResult.value = hash;
  } catch (e: any) {
    error.value = `计算哈希失败: ${e.message}`;
  } finally {
    busy.value = false;
  }
}

// 文件写入
async function handleWriteText() {
  error.value = '';
  result.value = null;
  hashResult.value = '';
  busy.value = true;

  try {
    const opts: any = { createParents: createParents.value };

    if (usePrecondition.value) {
      try {
        const { hash } = await workspace.value!.readText(writePath.value);
        opts.preconditionSha256 = hash;
      } catch (e) {
        // 文件可能不存在，忽略错误
      }
    }

    const hash = await workspace.value!.writeText(writePath.value, writeContent.value, opts);
    result.value = '写入文本成功';
    hashResult.value = hash;
  } catch (e: any) {
    error.value = `写入文本失败: ${e.message}`;
    if (e.code === 'PRECONDITION_FAILED' && e.currentHash) {
      error.value += `\n当前文件哈希值: ${e.currentHash}`;
    }
  } finally {
    busy.value = false;
  }
}

// 目录操作
async function handleEnsureDir() {
  error.value = '';
  result.value = null;
  busy.value = true;

  try {
    await workspace.value!.ensureDir(dirPath.value);
    result.value = `目录创建成功: ${dirPath.value}`;
  } catch (e: any) {
    error.value = `创建目录失败: ${e.message}`;
  } finally {
    busy.value = false;
  }
}

async function handleWalkDir() {
  error.value = '';
  result.value = null;
  busy.value = true;

  try {
    const files = await workspace.value!.walk(dirPath.value);
    result.value = `递归遍历发现 ${files.length} 个文件:\n${files.join('\n')}`;
  } catch (e: any) {
    error.value = `递归遍历失败: ${e.message}`;
  } finally {
    busy.value = false;
  }
}

// 移动/重命名
async function handleMove() {
  error.value = '';
  result.value = null;
  busy.value = true;

  try {
    await workspace.value!.move(moveSrc.value, moveDest.value, {
      createParents: moveCreateParents.value
    });
    result.value = `移动/重命名成功:\n${moveSrc.value} → ${moveDest.value}`;
  } catch (e: any) {
    error.value = `移动/重命名失败: ${e.message}`;
  } finally {
    busy.value = false;
  }
}

// 删除操作
async function handleDeleteItem(path: string) {
  if (!confirm(`确认删除 "${path}"？`)) return;

  error.value = '';
  result.value = null;
  busy.value = true;

  try {
    await workspace.value!.remove(path);
    result.value = `删除成功: ${path}`;
    // 刷新当前目录
    await handleListDir();
  } catch (e: any) {
    error.value = `删除失败: ${e.message}`;
  } finally {
    busy.value = false;
  }
}

// 读取文件
async function handleReadFile(path: string) {
  readPath.value = path;
  activeTab.value = 'read';
  await handleReadText();
}

// 查看状态
async function handleStat() {
  error.value = '';
  result.value = null;
  busy.value = true;

  try {
    const stat = await workspace.value!.stat(statPath.value);
    if (stat) {
      result.value = stat;
    } else {
      result.value = `路径不存在: ${statPath.value}`;
    }
  } catch (e: any) {
    error.value = `获取状态失败: ${e.message}`;
  } finally {
    busy.value = false;
  }
}

// 工具函数
function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}
</script>

<style scoped>
.workspace-test-container {
  background-color: #f5f5f5;
}

.result-pre {
  max-height: 300px;
  overflow: auto;
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

