import { hasOwn } from '../shared';

// 在 render 上下文中平时还会访问到诸如：$data, $props, $slots 等属性，可以统一整合代理到上下文中以便访问
const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
};

// 负责处理 component 各项数据代理到 render 函数的上下文中，在 render 内部通过 this 直接访问
export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState, props } = instance;

    if (hasOwn(setupState, key)) {
      return setupState[key];
    } else if (hasOwn(props, key)) {
      return props[key];
    }

    const publicGetter = publicPropertiesMap[key];
    if (publicGetter) {
      return publicGetter(instance);
    }
  },
};
