<script setup lang="ts">
import {ref} from 'vue';
import {useVbenForm, z} from '#/adapter/form';
import {useVbenModal} from '@vben/common-ui';
import {currentNode, currentEaog, EditableEaogNode} from '../models/eaog-node';

import {useHistory} from '../composables/eaog-history';
const history = useHistory();

// 导入您的Schema定义
// @ts-ignore
import {
  cpNodeSchema,
  cpInstructionSchema,
  recursionSchema,
  iteratorBaseSchema,
  baseNodeSchema,
  corSchema,
  allNodeTypes
} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog.zod.js";

// 节点类型选项
const nodeTypeOptions = allNodeTypes.map((type: string) => ({label: type, value: type}));

const title = ref(); // 模态框标题
// 将isEdit改为mode，使用字符串枚举
type FormMode = 'create-eaog' | 'edit-node' | 'add-node';
const mode = ref<FormMode>('add-node');
const position = ref<'before' | 'after' | 'child' | 'parent'>('after');
const tempNodeValues = ref<any>(); // 用于暂存新建节点的值

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
      dependencies: {
        triggerFields: ['type'],
        disabled: () => mode.value === 'edit-node', // 编辑时禁用类型选择
      },
      controlClass: 'w-full',
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
    // 指令节点特有字段 action
    {
      component: 'Input',
      fieldName: 'action',
      label: '指令内容',
      componentProps: {
        placeholder: '请输入指令内容',
      },
      dependencies: {
        triggerFields: ['type'],
        if: (values) => values.type === 'instruction',
        rules: cpInstructionSchema.shape.action,
      },
    },

    // 指令节点特有字段 - params
    {
      component: 'JsonViewer',
      fieldName: 'params',
      label: 'params(JSON)',
      defaultValue: {}, // 关键：设置默认值
      componentProps: {
        copyable: true,
        expandDepth: 2,
        previewMode: false, // 设为 false 启用编辑模式
      },
      dependencies: {
        triggerFields: ['type'],
        if: (values) => values.type === 'instruction',
      },
    },
    // 指令节点特有字段 - results
    {
      component: 'JsonViewer',
      fieldName: 'results',
      label: 'results(JSON)',
      defaultValue: {}, // 关键：设置默认值
      componentProps: {
        copyable: true,
        expandDepth: 2,
        previewMode: false, // 设为 false 启用编辑模式
      },
      dependencies: {
        triggerFields: ['type'],
        if: (values) => values.type === 'instruction',
      },
    },

    // TODO: 指令节点特有字段 - params、results 专用控件 待开发，参考：https://deepwiki.com/search/dynamicrecordformexamplevuedyn_ee420cbb-9fca-47e9-a43e-31440755b3ce

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
        if: (values) => values.type === 'recursion',
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
        if: (values) => ['sitr', 'pitr', 'for', 'pfor'].includes(values.type),
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
        if: (values) => ['sitr', 'pitr', 'for', 'pfor'].includes(values.type),
        rules: iteratorBaseSchema.shape.item,
      },
    },

    // 选择(cor) 字段 - condition
    {
      component: 'Input',
      fieldName: 'condition',
      label: '条件表达式',
      componentProps: {
        placeholder: '请输入条件表达式',
      },
      dependencies: {
        triggerFields: ['type'],
        if: (values) => ['cor'].includes(values.type),
        rules: corSchema.shape.condition,
      },
    },

    // 选项字段 - choice
    {
      component: 'Input',
      fieldName: 'choice',
      label: '选项名称',
      componentProps: {
        placeholder: '请输入选项名称',
      },
      dependencies: {
        triggerFields: ['type'],
        if: (values) => currentNode.value?.parent?.type === 'cor',
        rules: baseNodeSchema.shape.choice,
      },
    },
  ],
  handleSubmit: async (values) => {
    try {
      if (mode.value === 'edit-node') {
        // 编辑节点模式
        // 合并回未编辑的值，如：children、id等，然后校验
        const v = currentNode.value.getFormValues(values);
        const isModified = v !== undefined;
        if (isModified) {
          cpNodeSchema.parse(v);
          // 更新currentNode的值
          currentNode.value.mergeFormValues(values);
          currentNode.value.markAsNewlyModifiedForAWhile();
        }
      } else {
        // 新建节点模式 (add-node 或 create-eaog)
        values = {...values, children: []}; // 表单上没有children字段，手动添加
        cpNodeSchema.parse(values);

        // 创建新的EditableEaogNode实例
        const newNode = new EditableEaogNode(values);

        if (mode.value === 'create-eaog') {
          // 新建EAOG
          currentEaog.value = newNode;
          currentNode.value = null; // 清空当前节点
        } else if (currentNode.value) {
          // 添加节点
          currentNode.value.insert(newNode, position.value);
          newNode.markAsNewlyModifiedForAWhile();
        } else if (currentEaog.value == null) {
          // 没有当前EAOG时自动创建
          currentEaog.value = newNode;
        } else {
          console.error('当前没有可插入的父节点');
          return;
        }
      }

      history.addToHistory();
      modalApi.close(); // 提交成功后关闭模态框
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  },
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  onConfirm: () => formApi.submitForm(),
  onOpenChange: (isOpen) => {
    if (isOpen) {
      const { formMode = 'add-node', insertPosition = 'after' } = modalApi.getData() || {};
      mode.value = formMode;
      position.value = insertPosition;

      // 根据不同模式设置标题和表单数据
      if (mode.value === 'edit-node') {
        title.value = "编辑节点";
        formApi.setValues(currentNode.value?.getFormValues());
      } else if (mode.value === 'create-eaog') {
        title.value = "新建EAOG";
        formApi.resetForm();
      } else {
        // add-node 模式
        title.value = "添加节点";
        formApi.resetForm();
      }
    }
  },
});

// 暴露API供父组件调用
defineExpose({
  open: ({ formMode = 'add-node', insertPosition = 'after' }: {
    formMode?: FormMode;
    insertPosition?: 'before' | 'after' | 'child' | 'parent';
  } = {}) => {
    modalApi.setData({ formMode, insertPosition }).open();
  }
});
</script>

<template>
  <Modal :title="title">
    <Form/>
  </Modal>
</template>
