<script setup lang="ts">
// @DEV 如何利用useVbenForm，为形如z.record(z.string(), z.union([z.string(), z.function(), z.any()]))的数据，生成表单Input，让用户使用时，可以动态添加/删除 record的item？
// https://deepwiki.com/search/usevbenformzrecordzstring-zuni_aa8f1434-b1b3-4536-933c-6b33d74c13cd

import {ref, computed, onMounted, reactive, h} from 'vue';
import {useVbenForm, z} from '#/adapter/form';
import {VbenButton} from '@vben-core/shadcn-ui';

// 定义完整的 schema
const formSchema = z.object({
  name: z.string().min(3),
  value: z.record(z.string(), z.union([z.string(), z.function(), z.any()]))
});

// 动态记录项状态
const recordItems = ref<Array<{ key: string; id: string }>>([]);
let itemCounter = 0;

// 生成唯一ID
const generateId = () => `item_${++itemCounter}_${Date.now()}`;

// 动态生成表单 schema
const dynamicSchema = computed(() => {
  const baseSchema = [
    {
      component: 'Input',
      fieldName: 'name',
      label: '名称',
      rules: z.string().min(3, '名称至少需要3个字符'),
      // 在名称字段后添加"添加记录项"按钮
      suffix: () => h('button', {
        type: 'button',
        class: 'ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap',
        onClick: addRecordItem
      }, '添加记录项')
    }
  ];

  const recordSchema = recordItems.value.flatMap(item => [
    {
      component: 'Input',
      fieldName: `key_${item.id}`,
      label: `键 ${item.key}`,
      defaultValue: item.key,
      componentProps: {
        placeholder: '请输入键名',
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
      // 在键字段后添加"删除"按钮
      suffix: () => h('button', {
        type: 'button',
        class: 'ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 whitespace-nowrap',
        onClick: () => removeRecordItem(item.id)
      }, '删除')
    },
    {
      component: 'Input',
      fieldName: `value_${item.id}`,
      label: `值 ${item.key}`,
      componentProps: {
        placeholder: '请输入值'
      }
    }
  ]);

  return [...baseSchema, ...recordSchema];
});

// 检查键名是否唯一
const isKeyUnique = (key: string, currentId: string) => {
  return !recordItems.value.some(item => item.key === key && item.id !== currentId);
};

const [Form, formApi] = useVbenForm(reactive({
  schema: dynamicSchema,
  commonConfig: {
    hideRequiredMark: true,
  },
  showDefaultActions: false, // 禁用默认提交按钮
}));

// 简化的添加方法
const addRecordItem = () => {
  const newKey = `key_${recordItems.value.length + 1}`;
  recordItems.value.push({
    key: newKey,
    id: generateId()
  });
  // schema 会自动响应式更新，无需手动调用 updateSchema
};

// 删除记录项
const removeRecordItem = (itemId: string) => {
  const itemIndex = recordItems.value.findIndex(item => item.id === itemId);
  if (itemIndex === -1) return;

  const item = recordItems.value[itemIndex];
  const fieldsToRemove = [
    `value.${item?.key}.key`,
    `value.${item?.key}.value`
  ];

  // 从表单中移除字段
  formApi.removeSchemaByFields(fieldsToRemove);

  // 从状态中移除项目
  recordItems.value.splice(itemIndex, 1);

  // schema 会自动响应式更新，无需手动调用 updateSchema
  // 更新表单 schema
  // formApi.updateSchema(dynamicSchema.value);
};


// 更新记录项的键名
const updateRecordKey = async (itemId: string, event: InputEvent) => {
  event.stopPropagation();
  event.preventDefault();
  const target = event.target as HTMLInputElement;
  const newKey = target.value;

  const item = recordItems.value.find(item => item.id === itemId);
  if (item && item.key !== newKey) {
    const oldKey = item.key;
    item.key = newKey;

    // 获取当前表单值
    const currentValues = await formApi.getValues();
    if (currentValues.value?.[oldKey]) {
      await formApi.setFieldValue(`value.${newKey}`, currentValues.value[oldKey]);
      await formApi.setFieldValue(`value.${oldKey}`, undefined);
    }
  }
};


// 自定义提交处理
const handleSubmit = async () => {
  const {valid} = await formApi.validate();
  if (valid) {
    const values = await formApi.getValues();
    const transformedValues = transformFormValues(values);

    // 验证数据
    const result = formSchema.safeParse(transformedValues);
    if (result.success) {
      console.log('验证成功:', result.data);
    } else {
      console.error('验证失败:', result.error);
    }
  }
};

// 转换表单值为目标格式
const transformFormValues = (values: any) => {
  const result = {
    name: values.name,
    value: {} as Record<string, any>
  };

  // 重构 value 对象 - 使用新的字段命名方式
  recordItems.value.forEach(item => {
    const keyFieldName = `key_${item.id}`;
    const valueFieldName = `value_${item.id}`;

    const keyValue = values[keyFieldName] || item.key; // 获取用户输入的键名
    const itemValue = values[valueFieldName]; // 获取对应的值

    if (keyValue && itemValue !== undefined) {
      result.value[keyValue] = itemValue;
    }
  });

  return result;
};


onMounted(() => {
  addRecordItem();
  addRecordItem();
});

// 设置初始值
formApi.setValues({
  name: '示例配置',
  'value.key_1.key': 'config1',
  'value.key_1.value': 'value1',
  'value.key_2.key': 'config2',
  'value.key_2.value': 'value2'
});


</script>

<template>
  <div class="dynamic-record-form">
    <!-- 调试信息 -->
    <div class="mb-4 p-2 bg-gray-100 text-xs">
      <div>Record Items: {{ recordItems.length }}</div>
      <div v-for="item in recordItems" :key="item.id">
        Field Name: key_{{ item.id }}
      </div>
    </div>

    <Form/>


    <!-- 自定义提交按钮 -->
    <div class="mt-4">
      <button
        type="button"
        @click="handleSubmit"
        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        提交
      </button>
    </div>
  </div>
</template>
