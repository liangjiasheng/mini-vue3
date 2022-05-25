import { ShapeFlags } from '../shared/shapeFlags';

// 创建虚拟节点，也就是平时在 render 函数中使用的 h 函数
export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    el: null,
    shapeFlag: getShapeFlag(type),
  };

  // 通过 children 来判断 vnode 子节点是文本还是数组元素
  if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  } else if (typeof children === 'string') {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  }
  return vnode;
}

// 初始化 vnode shapeFlag 属性
function getShapeFlag(type: any) {
  // 通过 type 来判断 vnode 的类型是标签元素还是组件
  return typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}
