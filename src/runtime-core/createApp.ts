import { createVNode } from './vnode';

// 由于 createApp 不再是裸着导出去使用了，而是依赖于 render 函数，所以需要包装一层，提供 createRenderer 函数供自定义/默认渲染器，然后再创建应用启动函数
export function createAppAPI(render) {
  // entry，接收根组件参数，通过 mount 函数，先把根组件转成 vnode，然后渲染到指定的容器中
  return function createApp(rootComponent) {
    return {
      mount(rootContainer) {
        // 首先需要把 rootComponent 转换成 vnode，后面的一系列操作，都是基于 vnode 工作
        const vnode = createVNode(rootComponent);
        render(vnode, rootContainer);
      },
    };
  };
}
