// 创建虚拟节点，也就是平时在 render 函数中使用的 h 函数
export function createVNode(type, props?, children?) {
  return {
    type,
    props,
    children,
  };
}
