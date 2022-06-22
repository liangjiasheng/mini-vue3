import { h, getCurrentInstance } from '../../lib/guide-mini-vue.esm.js';

export const Foo = {
  name: 'Foo',
  setup() {
    // 实现 getCurrentInstance 函数，在 setup 函数中获取到当前组件实例对象
    const instance = getCurrentInstance();
    console.log('Foo:', instance);
    return {};
  },
  render() {
    return h('div', {}, 'foo');
  },
};
