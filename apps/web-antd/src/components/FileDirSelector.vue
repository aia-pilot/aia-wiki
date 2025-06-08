<script setup lang="ts">
import { Input, Button, message } from 'ant-design-vue';
import { defineProps, defineEmits } from 'vue';
import {IS_STANDALONE_APP} from "#/utils/aia-constants";

const props = defineProps({
  // v-model 绑定值
  value: {
    type: String,
    default: ''
  },
  // 输入框占位符
  placeholder: {
    type: String,
    default: '请选择或输入路径'
  },
  // 按钮文本
  buttonText: {
    type: String,
    default: '浏览...'
  },
  // 对话框标题
  dialogTitle: {
    type: String,
    default: '选择文件/文件夹'
  },
  // 对话框选项
  dialogOptions: {
    type: Object,
    default: () => ({
      properties: ['openDirectory']
    })
  }
});

const emit = defineEmits(['update:value', 'select']);

// 处理文件/文件夹选择对话框
const handleOpenFileDialog = async () => {
  try {
    // 调用Electron API打开系统对话框
    if (IS_STANDALONE_APP) {
      // @ts-ignore
      const paths = await window.electronAPI.invokeMain('use-sys-open-file-dir-dialog', {
        title: props.dialogTitle,
        ...props.dialogOptions
      });

      if (paths && paths.length) {
        const selectedPath = paths[0]; // 取第一个选择的路径
        emit('update:value', selectedPath);
        emit('select', selectedPath);
      }
    } else {
      message.warning('在浏览器环境中无法使用系统文件对话框');
    }
  } catch (error) {
    console.error('打开文件对话框失败:', error);
    message.error('打开文件对话框失败');
  }
};

// 处理手动输入
const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit('update:value', target.value);
};
</script>

<template>
  <div class="file-dir-selector">
    <Input
      :value="value"
      :placeholder="placeholder"
      @input="handleInput"
    />
    <Button type="link" class="browse-button" @click="handleOpenFileDialog">
      {{ buttonText }}
    </Button>
  </div>
</template>

<style scoped>
.file-dir-selector {
  position: relative;
  width: 100%;
}

.browse-button {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  margin: 0;
  z-index: 1;
  background: transparent;
}
</style>

