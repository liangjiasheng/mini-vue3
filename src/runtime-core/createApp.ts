import { createVNode } from './vnode';
import { render } from './renderer';

// entry，接收根组件参数，通过 mount 函数，先把根组件转成 vnode，然后渲染到指定的容器中
export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      // 首先需要把 rootComponent 转换成 vnode，后面的一系列操作，都是基于 vnode 工作
      const vnode = createVNode(rootComponent);
      render(vnode, rootContainer);
    },
  };
}
