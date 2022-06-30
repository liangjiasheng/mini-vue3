import effect from '../reactivity/effect';
import { EMPTY_OBJ } from '../shared';
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
    setElementText: hostSetElementText,
    remove: hostRemove,
  } = options;

  function render(vnode, container) {
    patch(null, vnode, container, null, null);
  }

  // patch 函数，负责处理 component 和 element 在 mount 和 update 阶段的一系列工作，单独抽离 patch 函数，是为了后面处理 children 时候递归调用
  function patch(n1, n2, container, parent, anchor) {
    const { shapeFlag, type } = n2;
    // 处理特殊类型如 Fragment，Text 和普通类型如标签元素，组件
    switch (type) {
      case Fragment:
        processFragment(n2, container, parent, anchor);
        break;
      case Text:
        processText(n2, container);
        break;
      default:
        // 通过 if/ else 检测 n1, n2 或 children 是什么类型来判断渲染的方式（通过访问对象内属性来判断）比较低效，考虑到性能问题，可以借助位运算的方式进行优化（可读性 vs 性能）
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parent, anchor);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parent, anchor);
        }
        break;
    }
  }

  function processFragment(vnode, container: any, parent, anchor) {
    const { children } = vnode;
    mountChildren(children, container, parent, anchor);
  }

  function processText(vnode, container: any) {
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.appendChild(textNode);
  }

  function processElement(n1, n2, container, parent, anchor) {
    // 根据是否存在老节点（已挂载后）来判断当前走 mount 流程还是 update 流程
    if (!n1) {
      mountElement(n2, container, parent, anchor);
    } else {
      patchElement(n1, n2, container, parent, anchor);
    }
  }

  function mountElement(vnode, container: any, parent, anchor) {
    // vnode 是标签元素的情况下：绑定当前根元素到 vnode 上
    // const el = (vnode.el = document.createElement(vnode.type));
    const el = (vnode.el = hostCreateElement(vnode.type));
    const { props, children, shapeFlag } = vnode;

    // children 支持文本 string 类型与子元素 array 类型
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, parent, anchor);
    }

    for (const key in props) {
      const val = props[key];
      hostPatchProp(el, key, null, val);
    }

    // container.appendChild(el);
    hostInsert(el, container);
  }

  function patchElement(n1, n2, container, parent, anchor) {
    console.log('patchElement', n1, n2);
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;

    const el = (n2.el = n1.el);
    // 元素的更新：
    //   值
    //   子节点
    patchProps(el, oldProps, newProps);
    patchChildren(n1, n2, el, parent, anchor);
  }

  function patchChildren(n1, n2, container, parent, anchor) {
    const { children: c1, shapeFlag: s1 } = n1;
    const { children: c2, shapeFlag: s2 } = n2;
    if (s1 & ShapeFlags.TEXT_CHILDREN) {
      if (s2 & ShapeFlags.TEXT_CHILDREN) {
        // old 子节点是文本，new 子节点也是文本，如果值不同，则更新 container 文本节点的内容
        if (c1 !== c2) {
          hostSetElementText(container, c2);
        }
      } else {
        // old 子节点是文本，new 子节点是数组，则把 container 下的 old 文本节点置空后，把 new 子节点挂载到 container 上
        hostSetElementText(container, '');
        mountChildren(c2, container, parent, anchor);
      }
    } else {
      if (s2 & ShapeFlags.TEXT_CHILDREN) {
        // old 子节点是数组，new 子节点是文本，则把 container 下的 old 子节点卸载，把 new 子节点的文本内容设置到 container 上
        unmountChildren(c1);
        hostSetElementText(container, c2);
      } else {
        // old 子节点是数组，new 子节点也是数组，则需要对二者进行 diff 操作，比对找出需要更新的子节点
        console.log('diff 新旧 children');
        patchKeyedChildren(c1, c2, container, parent, anchor);
      }
    }
  }

  function patchKeyedChildren(
    c1: any,
    c2: any,
    container: any,
    parent: any,
    anchor
  ) {
    let i = 0; // 指向 n2 开头的位置
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
    function isSameNode(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key;
    }
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameNode(n1, n2)) {
        patch(n1, n2, container, parent, anchor);
      } else {
        break;
      }

      i++;
    }

    console.log('左侧比对完，此时的i：', i);

    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameNode(n1, n2)) {
        patch(n1, n2, container, parent, anchor);
      } else {
        break;
      }
      e1--;
      e2--;
    }

    console.log('右侧比对完，此时的i：', i);

    if (i > e1) {
      if (i <= e2) {
        // c2 比 c1 多，新增
        // const nextPos = e2 + 1;
        // const anchor = nextPos < c2.length ? c2[nextPos].el : null;
        // console.log(nextPos < c2.length ? c2[nextPos].el : null);
        // if (nextPos < c2.length) {
        //   patch(null, c2[i], container, parent, c2[nextPos]);
        // } else {
        //   patch(null, c2[i], container, parent, null);
        // }
        // patch(null, c2[i], container, parent, anchor);
      }
    }
  }

  function unmountChildren(childs) {
    childs.forEach((child) => {
      hostRemove(child.el);
    });
  }

  function patchProps(el: any, oldProps: any, newProps: any) {
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prevVal = oldProps[key];
        const nextVal = newProps[key];

        if (prevVal !== nextVal) {
          hostPatchProp(el, key, prevVal, nextVal);
        }
      }

      if (oldProps !== EMPTY_OBJ) {
        for (const key in oldProps) {
          // old 有而 new 没有的属性，移除
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null);
          }
        }
      }
    }
  }

  // 利用 patch 函数递归处理 children 中的 vnode
  function mountChildren(children: any[], el: any, parent, anchor) {
    children.forEach((v) => {
      patch(null, v, el, parent, anchor);
    });
  }

  function processComponent(n1, n2, container: any, parent, anchor) {
    //! TODO 分别处理 mount 和 update 流程
    if (!n1) {
      mountComponent(n2, container, parent, anchor);
    } else {
      console.log('component 更新逻辑');
    }
  }

  function mountComponent(initialVNode, container: any, parent, anchor) {
    /* 
      1、初始化 component 实例
      2、设置 component 实例的各项数据，如 props, slots, proxy等等
      3、调用 render 函数获取 subTree
    */
    const instance = createComponentInstance(initialVNode, parent);
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container, anchor);
  }

  function setupRenderEffect(instance, initialVNode, container, anchor) {
    // 响应式数据改变 -> 重新执行 render 函数 -> 根据改变后的数据重新生成 subTree，然后通过 patch 进行更新
    effect(() => {
      // 标识组件实例是否已挂载
      if (!instance.isMounted) {
        console.log('component init');

        // 由于可以在 render 函数中可以通过 this 访问到诸如 component setup 结果或实例上属性等，所以需要把各项数据代理到 render 函数的上下文中
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);

        instance.subTree = subTree;

        patch(null, subTree, container, instance, anchor);

        /* 
          1、在 mountElement 步骤中创建根元素并赋值到 vnode 的 el 属性上
          2、component 类型没有经过 mountElement 步骤，所以需要在最后处理完内部所有元素或组件后，把 render 函数返回的 vnode 上的 el 赋值给组件实例上
        */
        initialVNode.el = subTree.el;
        instance.isMounted = true;
      } else {
        console.log('component update');
        const { proxy } = instance;
        // 重新执行 render，生成新的 subTree 后，重新赋值到 instance 上，并调用 patch 函数进行更新
        const subTree = instance.render.call(proxy);
        const prevTree = instance.subTree;
        instance.subTree = subTree;
        patch(prevTree, subTree, container, instance, anchor);
      }
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}
