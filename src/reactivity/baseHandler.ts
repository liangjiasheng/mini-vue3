import { track, trigger } from './effect';
import { ReactiveFlags } from './reactive';

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);

function createGetter(isReadonly = false) {
  return function (target, key) {
    const res = Reflect.get(target, key);
    // 通过 key 值返回相应的 isReadonly 值给到 isReadonly/isReactive 进行判断
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
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
