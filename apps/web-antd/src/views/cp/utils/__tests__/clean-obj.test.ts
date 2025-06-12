import { getCleanObj } from '../clean-obj';
import { describe, test, expect } from 'vitest';

// @ts-nocheck
describe('getCleanObj function', () => {
  // 测试数据
  const testObj = {
    a: 1,
    b: undefined,
    c: {
      d: 2,
      e: undefined,
      f: {}
    },
    g: null,
    h: []
  };

  test('默认配置应该只移除 undefined 值', () => {
    const result = getCleanObj(testObj);

    expect(result).toEqual({
      a: 1,
      c: {
        d: 2,
        f: {}
      },
      g: null,
      h: []
    });

    // 验证 b 和 c.e 被移除（它们是 undefined）
    expect(result).toHaveProperty('a');
    expect(result).not.toHaveProperty('b');
    expect(result).toHaveProperty('c');
    expect(result?.c).toHaveProperty('d');
    expect(result?.c).not.toHaveProperty('e');
  });

  test('不保留 null、空数组和空对象', () => {
    const result = getCleanObj(testObj, {
      null: false,
      emptyArray: false,
      emptyObject: false
    });

    expect(result).toEqual({
      a: 1,
      c: {
        d: 2
      }
    });

    // 验证 g (null)、h (空数组) 和 c.f (空对象) 被移除
    expect(result).not.toHaveProperty('g');
    expect(result).not.toHaveProperty('h');
    expect(result?.c).not.toHaveProperty('f');
  });

  test('不保留 null 和空数组，但保留空对象', () => {
    const result = getCleanObj(testObj, {
      null: false,
      emptyArray: false,
      emptyObject: true
    });

    expect(result).toEqual({
      a: 1,
      c: {
        d: 2,
        f: {}
      }
    });

    // 验证 g (null) 和 h (空数组) 被移除，但 c.f (空对象) 被保留
    expect(result).not.toHaveProperty('g');
    expect(result).not.toHaveProperty('h');
    expect(result?.c).toHaveProperty('f');
    expect(Object.keys(result?.c?.f || {})).toHaveLength(0);
  });

  test('不保留 null、保留空数组和空对象', () => {
    const result = getCleanObj(testObj, {
      null: false,
      emptyArray: true,
      emptyObject: true
    });

    expect(result).toEqual({
      a: 1,
      c: {
        d: 2,
        f: {}
      },
      h: []
    });

    // 验证 g (null) 被移除，但 h (空数组) 和 c.f (空对象) 被保留
    expect(result).not.toHaveProperty('g');
    expect(result).toHaveProperty('h');
    expect(result?.h).toHaveLength(0);
    expect(result?.c).toHaveProperty('f');
  });

  test('保留 null，不保留空数组，保留空对象', () => {
    const result = getCleanObj(testObj, {
      null: true,
      emptyArray: false,
      emptyObject: true
    });

    expect(result).toEqual({
      a: 1,
      c: {
        d: 2,
        f: {}
      },
      g: null
    });

    // 验证 g (null) 和 c.f (空对象) 被保留，但 h (空数组) 被移除
    expect(result).toHaveProperty('g');
    expect(result?.g).toBeNull();
    expect(result).not.toHaveProperty('h');
    expect(result?.c).toHaveProperty('f');
  });

  test('处理复杂嵌套数组', () => {
    const complexObj = {
      arr: [1, undefined, null, [], {}],
      nestedArr: [[1], [undefined], [null], [[]], [{}]]
    };

    const result = getCleanObj(complexObj, {
      null: false,
      emptyArray: false,
      emptyObject: false
    });

    expect(result).toEqual({
      arr: [1],
      nestedArr: [[1]]
    });
  });

  test('对非对象类型应直接返回', () => {
    expect(getCleanObj(123)).toBe(123);
    expect(getCleanObj('string')).toBe('string');
    expect(getCleanObj(true)).toBe(true);
    expect(getCleanObj(null)).toBeNull();
    expect(getCleanObj(undefined)).toBeUndefined();
  });

  test('整个对象为空时返回undefined或空对象', () => {
    const emptyObj = { a: undefined, b: undefined };

    // 默认配置应该返回空对象
    expect(getCleanObj(emptyObj)).toEqual({});

    // 不保留空对象时应该返回undefined
    expect(getCleanObj(emptyObj, { emptyObject: false })).toBeUndefined();
  });
});
