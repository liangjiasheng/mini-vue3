import { ShapeFlags } from '../shared/shapeFlags';
import { createComponentInstance, setupComponent } from './component';
import { createAppAPI } from './createApp';
import { Fragment, Text } from './vnode';

// 对外提供自定义渲染器的接口，接收底层渲染接口作为参数，返回使用自定义渲染器的 createApp 函数
export function createRenderer(options) {
  // 重命名 host 便于出错后排查，与底层默认的浏览器渲染接口区分开
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
  } = options;

  function render(vnode, container) {
    patch(vnode, container, null);
  }

  // patch 函数，负责处理 component 和 element 在 mount 和 update 阶段的一系列工作，单独抽离 patch 函数，是为了后面处理 children 时候递归调用
  function patch(vnode: any, container: any, parent) {
    const { shapeFlag, type } = vnode;
    // 处理特殊类型如 Fragment，Text和普通类型如标签元素，组件
    switch (type) {
      case Fragment:
        processFragment(vnode, container, parent);
        break;
      case Text:
        processText(vnode, container);
        break;
      default:
        // 通过 if/ else 检测 vnode 或 children 是什么类型来判断渲染的方式（通过访问对象内属性来判断）比较低效，考虑到性能问题，可以借助位运算的方式进行优化（可读性 vs 性能）
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(vnode, container, parent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(vnode, container, parent);
        }
        break;
    }
  }

  function processFragment(vnode: any, container: any, parent) {
    const { children } = vnode;
    mountChildren(children, container, parent);
  }

  function processText(vnode: any, container: any) {
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.appendChild(textNode);
  }

  function processElement(vnode, container, parent) {
    //! TODO 分别处理 mount 和 update 流程
    mountElement(vnode, container, parent);
  }

  function mountElement(vnode: any, container: any, parent) {
    // vnode 是标签元素的情况下：绑定当前根元素到 vnode 上
    // const el = (vnode.el = document.createElement(vnode.type));
    const el = (vnode.el = hostCreateElement(vnode.type));
    const { props, children } = vnode;

    // children 支持文本 string 类型与子元素 array 类型
    if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, parent);
    }
    hostPatchProp(el, props);
    // container.appendChild(el);
    hostInsert(el, container);
  }

  // 利用 patch 函数递归处理 children 中的 vnode
  function mountChildren(children: any[], el: any, parent) {
    children.forEach((v) => {
      patch(v, el, parent);
    });
  }

  function processComponent(vnode: any, container: any, parent) {
    //! TODO 分别处理 mount 和 update 流程
    mountComponent(vnode, container, parent);
  }

  function mountComponent(vnode: any, container: any, parent) {
    /* 
      1、初始化 component 实例
      2、设置 component 实例的各项数据，如 props, slots, proxy等等
      3、调用 render 函数获取 subTree
    */
    const instance = createComponentInstance(vnode, parent);
    setupComponent(instance);
    setupRenderEffect(instance, container);
  }

  function setupRenderEffect(instance, container) {
    // 由于可以在 render 函数中可以通过 this 访问到诸如 component setup 结果或实例上属性等，所以需要把各项数据代理到 render 函数的上下文中
    const subTree = instance.render.call(instance.proxy);

    patch(subTree, container, instance);

    /* 
      1、在 mountElement 步骤中创建根元素并赋值到 vnode 的 el 属性上
      2、component 类型没有经过 mountElement 步骤，所以需要在最后处理完内部所有元素或组件后，把 render 函数返回的 vnode 上的 el 赋值给组件实例上
    */
    instance.vnode.el = subTree.el;
  }

  return {
    createApp: createAppAPI(render),
  };
}
