// 组件 provide 和 inject 功能
import { h, provide, inject } from '../../lib/guide-mini-vue.esm.js';

const Provider = {
  name: 'Provider',
  setup() {
    provide('foo', 'fooVal');
    provide('bar', 'barVal');
  },
  render() {
    return h('div', {}, [h('p', {}, 'Provider'), h(ProviderTwo)]);
  },
};

const ProviderTwo = {
  name: 'ProviderTwo',
  setup() {
    // 组件自身 provide 的，是提供给子孙组件使用的
    // 组件自身 inject 的，是需要获取父级组件注入的，所以此处的 fooTwo 是提供给子组件 Consumer，而 inject 进来的是 Provider 组件注入的 fooVal
    provide('foo', 'fooTwo');
    const foo = inject('foo');

    return {
      foo,
    };
  },
  render() {
    return h('div', {}, [
      h('p', {}, `ProviderTwo foo:${this.foo}`),
      h(Consumer),
    ]);
  },
};

const Consumer = {
  name: 'Consumer',
  setup() {
    const foo = inject('foo');
    const bar = inject('bar');
    // 支持默认值形式
    // const baz = inject('baz', 'bazDefault');
    // 支持函数形式返回默认值
    const baz = inject('baz', () => 'bazDefault');

    return {
      foo,
      bar,
      baz,
    };
  },

  render() {
    return h('div', {}, `Consumer: - ${this.foo} - ${this.bar} - ${this.baz}`);
  },
};

export default {
  name: 'App',
  setup() {},
  render() {
    return h('div', {}, [h('p', {}, 'apiInject'), h(Provider)]);
  },
};
