import { h, renderSlots } from '../../lib/guide-mini-vue.esm.js';

export const Foo = {
  setup() {
    return {};
  },
  render() {
    const foo = h('p', {}, 'foo');

    // 演变过程：vnode -> children -> object
    console.log(this.$slots);
    // children -> vnode
    //
    // renderSlots
    // 具名插槽（默认是 default）
    // 作用域插槽，可以把组件自身的值作为参数传递进去
    const age = 18;
    return h('div', {}, [
      renderSlots(this.$slots, 'header', {
        age,
      }),
      foo,
      renderSlots(this.$slots, 'footer'),
    ]);
  },
};
