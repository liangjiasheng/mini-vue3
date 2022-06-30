import { ShapeFlags } from '../shared/shapeFlags';

export function initSlots(instance, children) {
  const { vnode } = instance;
  // 判断当前 vnode 为有状态组件且其拥有 slots
  if (vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlots(children, instance.slots);
  }
}

function normalizeObjectSlots(children: any, slots: any) {
  for (const key in children) {
    const value = children[key];
    // 把组件的 children 挂载到组件实例上的 slots，并将其处理统一封装成函数的形式，可以支持组件调用时传入自身内部属性 props 供外部使用
    slots[key] = (props) => normalizeSlotValue(value(props));
  }
}

function normalizeSlotValue(value) {
  // 由于 render patch 渲染内容的时候只支持数组形式的 children，所以需要兼容处理 slot 函数返回的 vnode
  return Array.isArray(value) ? value : [value];
}
