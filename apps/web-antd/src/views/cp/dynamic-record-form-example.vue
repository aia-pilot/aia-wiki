<script setup lang="ts">
import { useVbenForm, z } from '#/adapter/form';
import DynamicRecordInput from './components/dynamic-record-input.vue';
import { markRaw } from 'vue';

const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Input',
      fieldName: 'name',
      label: '配置名称',
      rules: z.string().min(1, '名称不能为空'),
    },
    {
      component: markRaw(DynamicRecordInput), // 使用 markRaw 包装
      fieldName: 'config',
      label: '动态配置',
      componentProps: {
        placeholder: '请输入配置值',
      },
    },
  ],
  handleSubmit: (values) => {
    console.log('表单提交:', values);
  },
});
</script>

<template>
  <Form />
</template>

