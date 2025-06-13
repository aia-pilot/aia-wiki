<script setup lang="ts">
import {ref} from 'vue';
import {useVbenForm, z} from '#/adapter/form';
import {useVbenModal} from '@vben/common-ui';
import {currentNode, currentEaog, EditableEaogNode, zogErrorToString} from '../models/editable-eaog-node';

import {useHistory} from '../composables/eaog-history';

const history = useHistory();

// 导入您的Schema定义
// @formatter:off
// @ts-ignore
import {cpNodeSchema, cpInstructionSchema, recursionSchema, iteratorBaseSchema, baseNodeSchema, corSchema, allNodeTypes} from "../../../../../../../aia-se-comp/src/eaog/cp-eaog.zod.js";
import {message} from "ant-design-vue";
// @formatter:on

// 节点类型选项
const nodeTypeOptions = allNodeTypes.map((type: string) => ({label: type, value: type}));

const title = ref(); // 模态框标题，这个需要保持响应式以更新UI

// 使用普通变量而非响应式变量
type FormMode = 'create-eaog' | 'edit-node' | 'add-node';
let formMode: FormMode = 'add-node';
let insertPosition: 'before' | 'after' | 'child' | 'parent' = 'after';

// 简化函数，减少重复代码
const checkFormValues = (formValues: Record<string, any>) => {
  const nodeValues = {...formValues, children: []}; // 表单上没有children字段，手动添加
  cpNodeSchema.parse(nodeValues); // Zod校验表单数据，出错会抛出异常
  return nodeValues;
}

const createNodeFromForm = (formValues: Record<string, any>) => {
  const nodeValues = checkFormValues(formValues)
  return new EditableEaogNode(nodeValues);
}

// 处理表单提交
const handleFormSubmit = async (formValues: Record<string, any>) => {
  const { valid } = await formApi.validate();
  if (!valid) {
    return; // 如果验证失败，直接返回
  }
  try {
    if (formMode === 'edit-node') {
      const nodeValues = checkFormValues(formValues)
      currentNode.value?.mergeFormValues(nodeValues);
      currentNode.value?.markAsNewlyModifiedForAWhile();
    } else if (formMode === 'create-eaog') {
      const newNode = createNodeFromForm(formValues);
      currentEaog.value = newNode;
      currentNode.value = null;
    } else { // 'add-node' 模式
      const newNode = createNodeFromForm(formValues);
      currentNode.value?.insert(newNode, insertPosition);
      newNode.markAsNewlyModifiedForAWhile(); // 标记为新修改的节点，展示动效
    }

    history.addToHistory();
    modalApi.close(); // 提交成功后关闭模态框
  } catch (error) {
    if (error instanceof z.ZodError) {
      message.error(`表单验证失败，请检查输入.${zogErrorToString(error)}`, 5);
    } else {
      message.error(`提交失败: ${error instanceof Error ? error.message : '未知错误'}`, 5);
    }
  }
}

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
        disabled: () => formMode === 'edit-node', // 编辑时禁用类型选择
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
      },
        rules: cpInstructionSchema.shape.action,
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
      },
        rules: recursionSchema.shape.ref,
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
      },
        rules: iteratorBaseSchema.shape.items,
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
      },
        rules: iteratorBaseSchema.shape.item,
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
      },
      rules: corSchema.shape.condition,
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
        if: () => currentNode.value?.parent?.type === 'cor',
      },
      // rules: baseNodeSchema.shape.choice,
      rules: z.string().min(1, '选项名称不能为空'),
    },
  ],
  handleSubmit: handleFormSubmit,
  showDefaultActions: false,
});

const handleModalOpen = (isOpen: boolean) => {
  if (isOpen) {
    // 根据不同模式设置标题和表单数据
    switch (formMode) {
      case 'edit-node':
        title.value = "编辑节点";
        formApi.setValues(currentNode.value?.getObjFromFormValues() as Record<string, any> || {});
        break;
      case 'create-eaog':
        title.value = "新建EAOG";
        formApi.resetForm();
        break;
      case 'add-node':
        title.value = "添加节点";
        formApi.resetForm();
        break;
    }
  }
}

const [Modal, modalApi] = useVbenModal({
  onConfirm: () => formApi.submitForm(),
  onOpenChange: handleModalOpen,
});

// 表单操作方法 - 使用普通变量
const createEaog = () => {
  formMode = 'create-eaog';
  modalApi.open();
};

const editNode = () => {
  formMode = 'edit-node';
  modalApi.open();
};

const addNode = (position: 'before' | 'after' | 'child' | 'parent' = 'after') => {
  formMode = 'add-node';
  insertPosition = position;
  modalApi.open();
};

// 暴露API供父组件调用
defineExpose({
  createEaog,
  editNode,
  addNode
});
</script>

<template>
  <Modal :title="title">
    <Form/>
  </Modal>
</template>
