import { h, getCurrentInstance } from '../../lib/guide-mini-vue.esm.js';
import { Foo } from './Foo.js';

export const App = {
  name: 'App',
  render() {
    return h('div', {}, [h('p', {}, 'currentInstance demo'), h(Foo)]);
  },

  setup() {
    // 实现 getCurrentInstance 函数，在 setup 函数中获取到当前组件实例对象
    const instance = getCurrentInstance();
    console.log('App:', instance);
  },
};
