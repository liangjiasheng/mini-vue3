import { ShapeFlags } from "../shared/shapeFlags";

export const Fragment = Symbol("Fragment");

export const Text = Symbol("Text");

// 创建虚拟节点，也就是平时在 render 函数中使用的 h 函数
export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    el: null,
    key: props && props.key,
    shapeFlag: getShapeFlag(type),
    component: null,
  };

  // 通过 children 来判断 vnode 子节点是文本还是数组元素
  if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  } else if (typeof children === "string") {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  }

  // 通过 vnode 是有状态组件并且其 children 是对象来判断其拥有 slots
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === "object") {
      vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN;
    }
  }

  return vnode;
}

// 由于 children 数组中只允许存在 vnode，不支持直接传入纯文本，所以需要引入 Text 类型特殊处理，只创建一个文本节点
export function createTextVNode(text: string) {
  return createVNode(Text, {}, text);
}

// 初始化 vnode shapeFlag 属性
function getShapeFlag(type: any) {
  // 通过 type 来判断 vnode 的类型是标签元素还是组件
  return typeof type === "string"
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}
