import { isObject } from '../shared';
import { ShapeFlags } from '../shared/shapeFlags';
import { createComponentInstance, setupComponent } from './component';

export function render(vnode, container) {
  patch(vnode, container);
}

// patch 函数，负责处理 component 和 element 在 mount 和 update 阶段的一系列工作，单独抽离 patch 函数，是为了后面处理 children 时候递归调用
function patch(vnode: any, container: any) {
  const { shapeFlag } = vnode;
  //! TODO 分别处理 component 和 element 流程
  // 通过 if/ else 检测 vnode 或 children 是什么类型来判断渲染的方式（通过访问对象内属性来判断）比较低效，考虑到性能问题，可以借助位运算的方式进行优化（可读性 vs 性能）
  debugger;
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(vnode, container);
  } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container);
  }
}

function processElement(vnode, container) {
  //! TODO 分别处理 mount 和 update 流程
  mountElement(vnode, container);
}

function mountElement(vnode: any, container: any) {
  // vnode 是标签元素的情况下：绑定当前根元素到 vnode 上
  const el = (vnode.el = document.createElement(vnode.type));
  const { props, children } = vnode;

  // children 支持文本 string 类型与子元素 array 类型
  if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(children, el);
  }
  for (const key in props) {
    el.setAttribute(key, props[key]);
  }
  container.appendChild(el);
}

// 利用 patch 函数递归处理 children 中的 vnode
function mountChildren(children: any[], el: any) {
  children.forEach((v) => {
    patch(v, el);
  });
}

function processComponent(vnode: any, container: any) {
  //! TODO 分别处理 mount 和 update 流程
  mountComponent(vnode, container);
}

function mountComponent(vnode: any, container: any) {
  /* 
    1、初始化 component 实例
    2、设置 component 实例的各项数据，如 props, slots, proxy等等
    3、调用 render 函数获取 subTree
  */
  const instance = createComponentInstance(vnode);
  setupComponent(instance);
  setupRenderEffect(instance, container);
}

function setupRenderEffect(instance, container) {
  // 由于可以在 render 函数中可以通过 this 访问到诸如 component setup 结果或实例上属性等，所以需要把各项数据代理到 render 函数的上下文中
  const subTree = instance.render.call(instance.proxy);

  patch(subTree, container);

  /* 
    1、在 mountElement 步骤中创建根元素并赋值到 vnode 的 el 属性上
    2、component 类型没有经过 mountElement 步骤，所以需要在最后处理完内部所有元素或组件后，把 render 函数返回的 vnode 上的 el 赋值给组件实例上
  */
  instance.vnode.el = subTree.el;
}
