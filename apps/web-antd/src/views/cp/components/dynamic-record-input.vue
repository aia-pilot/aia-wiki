<script setup lang="ts">
import {ref, computed, h, watch, markRaw} from 'vue';
import { useVbenForm, z } from '#/adapter/form';

interface Props {
  modelValue?: Record<string, any>;
  placeholder?: string;
  disabled?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: Record<string, any>): void;
  (e: 'change', value: Record<string, any>): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({}),
  placeholder: '请输入值',
  disabled: false,
});

const emit = defineEmits<Emits>();

// 动态记录项状态
const recordItems = ref<Array<{ key: string; id: string }>>([]);
let itemCounter = 0;

// 生成唯一ID
const generateId = () => `item_${++itemCounter}_${Date.now()}`;

// 动态生成表单 schema
const dynamicSchema = computed(() => {
  const recordSchema = recordItems.value.flatMap(item => [
    {
      component: 'Input',
      fieldName: `key_${item.id}`,
      defaultValue: item.key,
      formItemClass: 'col-span-1',
      hideLabel: true,
      componentProps: {
        placeholder: '请输入键名',
        disabled: props.disabled,
        onChange: (event: InputEvent) => updateRecordKey(item.id, event)
      },
      rules: z
        .string()
        .min(1, '键名不能为空')
        .refine(
          (value: string) => {
            return isKeyUnique(value, item.id);
          },
          (value) => ({
            message: `键名 "${value}" 已存在，请使用其他名称`,
          }),
        ),
    },
    {
      component: 'Input',
      fieldName: `value_${item.id}`,
      formItemClass: 'col-span-3',
      hideLabel: true,
      componentProps: {
        placeholder: props.placeholder,
        disabled: props.disabled,
      },
      suffix: () => h('button', {
        type: 'button',
        class: 'ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 whitespace-nowrap',
        disabled: props.disabled,
        onClick: () => removeRecordItem(item.id)
      }, '删除')
    }
  ]);

  return recordSchema;
});

// 检查键名是否唯一
const isKeyUnique = (key: string, currentId: string) => {
  return !recordItems.value.some(item => item.key === key && item.id !== currentId);
};

const [Form, formApi] = useVbenForm(markRaw({
  schema: dynamicSchema,
  commonConfig: {
    hideRequiredMark: true,
    formItemClass: 'col-span-4',
  },
  wrapperClass: 'grid-cols-4',
  showDefaultActions: false,
  handleValuesChange: (values) => {
    const transformedValues = transformFormValues(values);
    emit('update:modelValue', transformedValues);
    emit('change', transformedValues);
  }
}));

// 添加记录项
const addRecordItem = () => {
  if (props.disabled) return;

  const newKey = `key_${recordItems.value.length + 1}`;
  recordItems.value.push({
    key: newKey,
    id: generateId()
  });
};

// 删除记录项
const removeRecordItem = (itemId: string) => {
  if (props.disabled) return;

  const itemIndex = recordItems.value.findIndex(item => item.id === itemId);
  if (itemIndex === -1) return;

  const item = recordItems.value[itemIndex];
  const fieldsToRemove = [
    `key_${item.id}`,
    `value_${item.id}`
  ];

  formApi.removeSchemaByFields(fieldsToRemove);
  recordItems.value.splice(itemIndex, 1);
};

// 更新记录项的键名
const updateRecordKey = async (itemId: string, event: InputEvent) => {
  if (props.disabled) return;

  event.stopPropagation();
  event.preventDefault();
  const target = event.target as HTMLInputElement;
  const newKey = target.value;

  const item = recordItems.value.find(item => item.id === itemId);
  if (item && item.key !== newKey) {
    item.key = newKey;
  }
};

// 转换表单值为目标格式
const transformFormValues = (values: any) => {
  const result: Record<string, any> = {};

  recordItems.value.forEach(item => {
    const keyFieldName = `key_${item.id}`;
    const valueFieldName = `value_${item.id}`;

    const keyValue = values[keyFieldName] || item.key;
    const itemValue = values[valueFieldName];

    if (keyValue && itemValue !== undefined) {
      result[keyValue] = itemValue;
    }
  });

  return result;
};

// 初始化数据
const initializeFromModelValue = () => {
  recordItems.value = [];
  itemCounter = 0;

  const modelValue = props.modelValue || {};
  Object.entries(modelValue).forEach(([key, value]) => {
    const id = generateId();
    recordItems.value.push({ key, id });

    // 设置表单值
    setTimeout(() => {
      formApi.setFieldValue(`key_${id}`, key);
      formApi.setFieldValue(`value_${id}`, value);
    }, 0);
  });

  // 如果没有初始数据，添加一个空项
  if (Object.keys(modelValue).length === 0) {
    addRecordItem();
  }
};

// 监听 modelValue 变化
watch(() => props.modelValue, initializeFromModelValue, { immediate: true, deep: true });

// 暴露方法
defineExpose({
  addRecordItem,
  getFormApi: () => formApi,
});
</script>

<template>
  <div class="dynamic-record-input">
    <div class="mb-2 flex justify-between items-center">
      <span class="text-sm text-gray-600">键值对配置</span>
      <button
        v-if="!disabled"
        type="button"
        class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        @click="addRecordItem"
      >
        添加项目
      </button>
    </div>

    <Form />

    <div v-if="recordItems.length === 0" class="text-center text-gray-400 py-4">
      暂无数据，点击"添加项目"开始配置
    </div>
  </div>
</template>
