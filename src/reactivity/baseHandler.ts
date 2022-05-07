import { extend, isObject } from '../shared';
import { track, trigger } from './effect';
import { reactive, ReactiveFlags, readonly } from './reactive';

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

function createGetter(isReadonly = false, isShallow = false) {
  return function (target, key) {
    // 通过 key 值返回相应的 isReadonly 值给到 isReadonly/isReactive 进行判断
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }
    const res = Reflect.get(target, key);
    // 只处理最外层，嵌套的直接返回结果
    if (isShallow) return res;
    // 递归对嵌套的数据进行响应式处理
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }
    !isReadonly && track(target, key);
    return res;
  };
}

function createSetter() {
  return function (target, key, value) {
    const res = Reflect.set(target, key, value);
    trigger(target, key);
    return res;
  };
}

export const mutableHandlers = {
  get,
  set,
};

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key, value) {
    console.warn(
      `${target} 是 readonly，${key} 的值不允许设置为新值：${value}`
    );
    return true;
  },
};

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet,
});
