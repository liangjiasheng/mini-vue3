import { isObject } from '../shared';
import { createComponentInstance, setupComponent } from './component';

export function render(vnode, container) {
  patch(vnode, container);
}

// patch 函数，负责处理 component 和 element 在 mount 和 update 阶段的一系列工作，单独抽离 patch 函数，是为了后面处理 children 时候递归调用
function patch(vnode: any, container: any) {
  //! TODO 分别处理 component 和 element 流程
  if (typeof vnode.type === 'string') {
    processElement(vnode, container);
  } else if (isObject(vnode.type)) {
    processComponent(vnode, container);
  }
}

function processElement(vnode, container) {
  //! TODO 分别处理 mount 和 update 流程
  mountElement(vnode, container);
}

function mountElement(vnode: any, container: any) {
  const el = document.createElement(vnode.type);
  const { props, children } = vnode;
  // children 支持文本 string 类型与子元素 array 类型
  if (typeof children === 'string') {
    el.textContent = children;
  } else if (Array.isArray(children)) {
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
}
