import { mutableHandlers, readonlyHandlers } from './baseHandler';

export const enum ReactiveFlags {
  IS_READONLY = '__v_is_readonly',
  IS_REACTIVE = '__v_is_reactive',
}

export function reactive(raw) {
  return createActiveObject(raw, mutableHandlers);
}

export function readonly(raw) {
  return createActiveObject(raw, readonlyHandlers);
}

// 可以尝试抽离 return new Proxy 这种低代码，使其更有语义化
function createActiveObject(raw: any, baseHandlers: any) {
  return new Proxy(raw, baseHandlers);
}

// !! 兼容 value 为非 proxy(readonly/reactive) 处理过的值时，身上不存在 ReactiveFlags 的属性导致的返回 undefined 情况
export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY];
}

// 同理
export function isReactive(value) {
  return !!value[ReactiveFlags.IS_REACTIVE];
}
