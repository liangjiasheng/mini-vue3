import effect from "../reactivity/effect";
import { EMPTY_OBJ } from "../shared";
import { ShapeFlags } from "../shared/shapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { shouldComponentUpdate } from "./componentUpdateUtils";
import { createAppAPI } from "./createApp";
import { queueJobs } from "./scheduler";
import { Fragment, Text } from "./vnode";

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
        processFragment(n1, n2, container, parent, anchor);
        break;
      case Text:
        processText(n1, n2, container);
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

  function processFragment(n1, n2, container: any, parent, anchor) {
    const { children } = n2;
    mountChildren(children, container, parent, anchor);
  }

  function processText(n1, n2, container: any) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
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
    hostInsert(el, container, anchor);
  }

  function patchElement(n1, n2, container, parent, anchor) {
    console.log("patchElement", n1, n2);
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
        hostSetElementText(container, "");
        mountChildren(c2, container, parent, anchor);
      }
    } else {
      if (s2 & ShapeFlags.TEXT_CHILDREN) {
        // old 子节点是数组，new 子节点是文本，则把 container 下的 old 子节点卸载，把 new 子节点的文本内容设置到 container 上
        unmountChildren(c1);
        hostSetElementText(container, c2);
      } else {
        // old 子节点是数组，new 子节点也是数组，则需要对二者进行 diff 操作，比对找出需要更新的子节点
        console.log("diff 新旧 children");
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
    const l2 = c2.length;
    let e1 = c1.length - 1;
    let e2 = l2 - 1;
    function isSomeVNodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key;
    }
    // 从左往右移动 i（新节点）指针，比较双方当前索引元素是否为相同节点
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSomeVNodeType(n1, n2)) {
        patch(n1, n2, container, parent, anchor);
      } else {
        break;
      }

      i++;
    }

    // 从右往左移动新旧尾部指针，比较双方当前索引元素是否为相同节点
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSomeVNodeType(n1, n2)) {
        patch(n1, n2, container, parent, anchor);
      } else {
        break;
      }
      e1--;
      e2--;
    }

    if (i > e1) {
      // 双端对比过程，首尾新增的情况
      if (i <= e2) {
        // c2 比 c1 多，新增
        const nextPos = e2 + 1;
        // 锚点：后一个位置索引如果小于新节点长度，则获取后面元素作为锚点插入，否则超出范围，直接 append 到尾部
        const anchor = nextPos < l2 ? c2[nextPos].el : null;
        patch(null, c2[i], container, parent, anchor);
      }
    } else {
      // 双端对比结束，进入中间对比
      const s1 = i;
      const s2 = i;
      // 新节点中间对比的个数
      const toBePatched = e2 - s2 + 1;
      // 找到相同并进行 patch 的次数
      let patched = 0;
      let moved = false;
      let maxNewIndexSoFar = 0;
      // 遍历新节点中间部分，存放其 key -> newIndex 的位置表
      const keyToNewIndexMap = new Map();
      // 记录新节点中间部分（从 0 开始）映射到旧节点中间部分的索引值
      const newIndexToOldIndexMap = new Array(toBePatched);
      // 初始化 -> 后期这个 0 值意义在于其表示需要创建
      for (let i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0;
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }
      // 遍历老节点中间部分
      for (let i = s1; i <= e1; i++) {
        const preChild = c1[i];

        // 优化在新的中间部分全部 patch 完而老的还有的情况，那么老的剩余的都删除即可
        if (patched >= toBePatched) {
          hostRemove(preChild.el);
          continue;
        }

        // 记录老的中间部分是否存在映射到新的中间部分
        let newIndex;
        if (preChild.key != null) {
          // key 值的作用体现在，如果老节点有设置 key 值，那么在此处查询的时候，就可以通过映射查找到，时间复杂度为 O(1)
          newIndex = keyToNewIndexMap.get(preChild.key);
        } else {
          // 如果没有设置 key 值，那么只能再次循环新节点中间部分来查找
          for (let j = s2; j < e2; j++) {
            if (isSomeVNodeType(preChild, c2[j])) {
              newIndex = j;

              break;
            }
          }
        }

        if (newIndex === undefined) {
          //经过以上查找都没结果，那么代表老的在新的没对应映射，所以执行删除操作
          hostRemove(preChild.el);
        } else {
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }
          // 加 1 操作是为了避免 for 循环中 i 为 0，导致赋值后与上述 0 代表需要创建所冲突
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          // 找到对应节点，继续对其进行更新操作（继续 patch 他们的 props & children）
          patch(preChild, c2[newIndex], container, parent, null);
          patched++;
        }
      }
      // 处理中间部分中元素位置移动与创建
      // 通过 getSequence 方法找到中间部分中的最长递增子序列
      const sequence = moved ? getSequence(newIndexToOldIndexMap) : [];
      let j = sequence.length - 1;
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2;
        const nextChild = c2[nextIndex];
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
        if (newIndexToOldIndexMap[i] === 0) {
          // 创建
          patch(null, nextChild, container, parent, anchor);
        } else if (moved) {
          if (j < 0 || i !== sequence[j]) {
            // 移动
            hostInsert(nextChild.el, container, anchor);
          } else {
            j--;
          }
        }
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
    if (!n1) {
      mountComponent(n2, container, parent, anchor);
    } else {
      updateComponent(n1, n2);
    }
  }

  function updateComponent(n1, n2) {
    // 获取已挂载的组件实例并挂在到新节点上，供后续更新继续操作
    const instance = (n2.component = n1.component);
    instance.next = n2;
    // 判断组件是否需要更新
    // 条件为父组件传递的 props 发生改变，才会触发子组件自身的更新
    if (shouldComponentUpdate(n1, n2)) {
      // 把新节点挂载到 instance 上，供 effect 函数内部获取新的组件 vnode
      instance.next = n2;
      instance.update();
    } else {
      // 无需更新，如父组件只改变了自身属性的情况下
      // 更新一下 vnode 及其上面的 el 属性
      n2.el = n1.el;
      instance.vnode = n2;
    }
  }

  // patch 组件内部 vnode 前，对组件实例的属性等进行更新，然后在后续中 patch 操作时候执行 render 时，内部通过 this 访问的是更新后的数据
  function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    instance.props = nextVNode.props;
  }

  function mountComponent(initialVNode, container: any, parent, anchor) {
    /* 
      1、初始化 component 实例
      2、设置 component 实例的各项数据，如 props, slots, proxy等等
      3、调用 render 函数获取 subTree
    */
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parent
    ));
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container, anchor);
  }

  function setupRenderEffect(instance, initialVNode, container, anchor) {
    // 响应式数据改变 -> 重新执行 render 函数 -> 根据改变后的数据重新生成 subTree，然后通过 patch 进行更新
    // 利用 effect 机制，返回 runner，供组件更新时候调用
    instance.update = effect(
      () => {
        // 标识组件实例是否已挂载
        if (!instance.isMounted) {
          console.log("component init");

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
          console.log("component update");
          // 若触发组件更新，在 updateComponent 函数中会给 next 赋值
          const { next, vnode } = instance;
          if (next) {
            next.el = vnode.el;
            updateComponentPreRender(instance, next);
          }
          const { proxy } = instance;
          // 重新执行 render，生成新的 subTree 后，重新赋值到 instance 上，并调用 patch 函数进行更新
          const subTree = instance.render.call(proxy);
          const prevTree = instance.subTree;
          instance.subTree = subTree;
          patch(prevTree, subTree, container, instance, anchor);
        }
      },
      {
        // 配置异步更新的调度任务
        scheduler() {
          queueJobs(instance.update);
        },
      }
    );
  }

  return {
    createApp: createAppAPI(render),
  };
}

// 获取最长递增子序列
function getSequence(arr) {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
