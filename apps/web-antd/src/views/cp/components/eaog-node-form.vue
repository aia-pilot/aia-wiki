<script setup lang="ts">
import {computed, ref} from 'vue';
import {useVbenForm, z} from '#/adapter/form';
import {useVbenModal} from '@vben/common-ui';

// 导入您的Schema定义
// @ts-ignore
import {instructionSchema, nodeSchema, recursionSchema, iteratorBaseSchema, baseNodeSchema, allNodeTypes} from "../../../../../../../aia-eaog/src/eaog.zod.js";

// const emit = defineEmits<{
//   success: [data: any];
// }>();

// 节点类型选项
const nodeTypeOptions = allNodeTypes.map((type: string) => ({label: type, value: type}));

const formData = ref( {});
const isEdit = computed(() => formData.value && Object.keys(formData.value).length > 0);
const title = computed(() => isEdit.value ? '编辑节点' : '创建节点');
const onSuccess = ref<((data: any) => void) | null>(null); // 用于接收父组件传入的成功回调

const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Select',
      fieldName: 'type',
      label: '节点类型',
      componentProps: {
        options: nodeTypeOptions,
        placeholder: '请选择节点类型',
      },
      rules: z.string().min(1, '请选择节点类型'),
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: '节点名称',
      rules: baseNodeSchema.shape.name,
    },
    {
      component: 'Textarea',
      fieldName: 'description',
      label: '描述',
      componentProps: {
        placeholder: '请输入节点描述（可选）',
        rows: 3,
      },
      rules: baseNodeSchema.shape.description,
    },
    // 递归节点特有字段
    {
      component: 'Input',
      fieldName: 'ref',
      label: '引用节点',
      componentProps: {
        placeholder: '请输入引用的节点名称',
      },
      dependencies: {
        triggerFields: ['type'],
        show: (values) => values.type === 'recursion',
        rules: recursionSchema.shape.ref,
      },
    },
    // 迭代器字段 - items
    {
      component: 'Input',
      fieldName: 'items',
      label: '迭代集合',
      componentProps: {
        placeholder: '请输入迭代集合名称',
      },
      dependencies: {
        triggerFields: ['type'],
        show: (values) => ['sitr', 'pitr', 'for', 'pfor'].includes(values.type),
        rules: iteratorBaseSchema.shape.items,
      },
    },
    // 迭代器字段 - item
    {
      component: 'Input',
      fieldName: 'item',
      label: '迭代项',
      componentProps: {
        placeholder: '请输入迭代项名称',
      },
      dependencies: {
        triggerFields: ['type'],
        show: (values) => ['sitr', 'pitr', 'for', 'pfor'].includes(values.type),
        rules: iteratorBaseSchema.shape.item,
      },
    },
  ],
  handleSubmit: async (values) => {
    try {
      // 使用完整的nodeSchema进行验证
      const validatedData = nodeSchema.parse(values);
      // TODO: 整个eaog校验，例如：children无重名。。。。
      onSuccess.value?.(validatedData);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  },
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  title: title.value,
  onConfirm: () => formApi.submitForm(),
  // onOpenChange: (isOpen) => {
  //   if (isOpen && isEdit.value) {
  //     formApi.setValues(formData.value);
  //   } else if (isOpen) {
  //     formApi.resetForm();
  //   }
  // },
});

// 暴露方法供父组件调用
defineExpose({
  open: ({ node, onSuccess: _onSuccess }: { node?: any; onSuccess: (data: any) => void }) => {
    if (node) {
      formData.value = node;
      formApi.setValues(node);
    } else {
      formData.value = {};
      formApi.resetForm();
    }
    onSuccess.value = _onSuccess;
    modalApi.open();
  },
});
</script>

<template>
  <Modal>
    <Form/>
  </Modal>
</template>

