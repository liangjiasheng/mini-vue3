import { hasOwn } from '../shared';

// 负责处理 component 各项数据代理到 render 函数的上下文中，在 render 内部通过 this 直接访问
export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState } = instance;

    if (hasOwn(setupState, key)) {
      return setupState[key];
    }
  },
};
