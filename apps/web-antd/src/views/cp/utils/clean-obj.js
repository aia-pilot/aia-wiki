/**
 * 深度递归去掉undefined、空对象、空数组、null值的属性。
 * 默认只去掉undefined，保留null，空数组和空对象。
 * @param obj
 * @param config {{null: boolean, emptyArray: boolean, emptyObject: boolean}} 配置项，是否保留null、空数组、空对象
 * @return {{[p: string]: *}|*}
 */
export const getCleanObj = (obj, config) => {
  config = Object.assign({null: true, emptyArray: true, emptyObject: true}, config || {});

  // 非对象直接返回
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  // 处理数组
  if (Array.isArray(obj)) {
    const newArray = obj.map(item => getCleanObj(item, config))
                        .filter(item => {
                          if (item === undefined) return false; // 永远过滤掉 undefined
                          if (item === null) return config.null;
                          if (Array.isArray(item) && item.length === 0) return config.emptyArray;
                          if (typeof item === 'object' && Object.keys(item).length === 0) return config.emptyObject;
                          return true;
                        });
    return newArray.length > 0 || config.emptyArray ? newArray : undefined;
  }

  // 处理对象
  const newObj = {};
  let isEmpty = true;

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = getCleanObj(obj[key], config);

      // 永远过滤掉 undefined 值
      if (value === undefined) continue;

      // 根据配置决定是否保留特定类型的值
      if (value === null && !config.null) continue;
      if (Array.isArray(value) && value.length === 0 && !config.emptyArray) continue;
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0 && !config.emptyObject) continue;

      newObj[key] = value;
      isEmpty = false;
    }
  }

  // 如果对象为空且配置不保留空对象，返回 undefined
  return !isEmpty || config.emptyObject ? newObj : undefined;
}

// 测试
// console.log({ a: 1, b: undefined, c: { d: 2, e: undefined, f: {} }, g: null, h: [] });
// console.log(getCleanObj({ a: 1, b: undefined, c: { d: 2, e: undefined, f: {} }, g: null, h: [] }));
// console.log(getCleanObj({ a: 1, b: undefined, c: { d: 2, e: undefined, f: {} }, g: null, h: [] }, { null: false, emptyArray: false, emptyObject: false }));
// console.log(getCleanObj({ a: 1, b: undefined, c: { d: 2, e: undefined, f: {} }, g: null, h: [] }, { null: false, emptyArray: false, emptyObject: true }));
// console.log(getCleanObj({ a: 1, b: undefined, c: { d: 2, e: undefined, f: {} }, g: null, h: [] }, { null: false, emptyArray: true, emptyObject: true }));
// console.log(getCleanObj({ a: 1, b: undefined, c: { d: 2, e: undefined, f: {} }, g: null, h: [] }, { null: true, emptyArray: false, emptyObject: true }));
