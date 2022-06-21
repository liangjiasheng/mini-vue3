import { h, createTextVNode } from '../../lib/guide-mini-vue.esm.js';
import { Foo } from './Foo.js';

// Fragment 以及 Text
export const App = {
  name: 'App',
  render() {
    const app = h('div', {}, 'App');
    // 平时编写的 template 中，在子组件标签内部，可通过具名插槽，把 children 渲染到指定位置，可以拆分为两步
    // 1、找到想要指定渲染的 vnode
    // 2、把步骤1的 vnode 渲染到指定的位置
    // 借助对象的 key，可以精准实现步骤1，找到我们想要渲染的元素/组件
    const foo = h(
      Foo,
      {},
      // 作用域插槽，组件内部调用 render 的时候，把内部自身的属性传入函数，实现在父级组件可以获取到当前组件内部属性来自定义渲染
      {
        header: ({ age }) => [
          h('p', {}, 'header' + age),
          createTextVNode('你好呀'),
        ],
        footer: () => h('p', {}, 'footer'),
      }
    );
    // 组件的 children 可以分为两种情况：数组和 vnode，如果没有指定插槽名字，默认都放到 default 中进行渲染
    // const foo = h(Foo, {}, h("p", {}, "123"));
    return h('div', {}, [app, foo]);
  },

  setup() {
    return {};
  },
};
