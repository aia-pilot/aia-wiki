/**
 * 配置选项接口，用于控制清理过程中保留的值类型
 */
interface CleanConfig {
  /** 是否保留 null 值，默认为 true */
  null: boolean;
  /** 是否保留空数组，默认为 true */
  emptyArray: boolean;
  /** 是否保留空对象，默认为 true */
  emptyObject: boolean;
}

/**
 * 深度递归去掉undefined、空对象、空数组、null值的属性。
 * 默认只去掉undefined，保留null，空数组和空对象。
 * @param obj - 需要清理的对象
 * @param config - 配置项，是否保留null、空数组、空对象
 * @return 清理后的对象
 */
export const getCleanObj = <T>(obj: T, config?: Partial<CleanConfig>): T | undefined => {
  const fullConfig: CleanConfig = Object.assign(
    { null: true, emptyArray: true, emptyObject: true }, 
    config || {}
  );

  // 非对象直接返回
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  // 处理数组
  if (Array.isArray(obj)) {
    const newArray = obj
      .map(item => getCleanObj(item, fullConfig))
      .filter(item => {
        if (item === undefined) return false; // 永远过滤掉 undefined
        if (item === null) return fullConfig.null;
        if (Array.isArray(item) && item.length === 0) return fullConfig.emptyArray;
        if (typeof item === 'object' && Object.keys(item).length === 0) return fullConfig.emptyObject;
        return true;
      });
    return (newArray.length > 0 || fullConfig.emptyArray ? newArray : undefined) as T | undefined;
  }

  // 处理对象
  const newObj: Record<string, any> = {};
  let isEmpty = true;

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = getCleanObj((obj as Record<string, any>)[key], fullConfig);

      // 永远过滤掉 undefined 值
      if (value === undefined) continue;

      // 根据配置决定是否保留特定类型的值
      if (value === null && !fullConfig.null) continue;
      if (Array.isArray(value) && value.length === 0 && !fullConfig.emptyArray) continue;
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0 && !fullConfig.emptyObject) continue;

      newObj[key] = value;
      isEmpty = false;
    }
  }

  // 如果对象为空且配置不保留空对象，返回 undefined
  return (!isEmpty || fullConfig.emptyObject ? newObj : undefined) as T | undefined;
};

// 测试用例注释保留，但不执行
// console.log({ a: 1, b: undefined, c: { d: 2, e: undefined, f: {} }, g: null, h: [] });
// console.log(getCleanObj({ a: 1, b: undefined, c: { d: 2, e: undefined, f: {} }, g: null, h: [] }));
// console.log(getCleanObj({ a: 1, b: undefined, c: { d: 2, e: undefined, f: {} }, g: null, h: [] }, { null: false, emptyArray: false, emptyObject: false }));
// console.log(getCleanObj({ a: 1, b: undefined, c: { d: 2, e: undefined, f: {} }, g: null, h: [] }, { null: false, emptyArray: false, emptyObject: true }));
// console.log(getCleanObj({ a: 1, b: undefined, c: { d: 2, e: undefined, f: {} }, g: null, h: [] }, { null: false, emptyArray: true, emptyObject: true }));
// console.log(getCleanObj({ a: 1, b: undefined, c: { d: 2, e: undefined, f: {} }, g: null, h: [] }, { null: true, emptyArray: false, emptyObject: true }));
