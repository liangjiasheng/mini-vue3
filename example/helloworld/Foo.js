import { h } from '../../lib/guide-mini-vue.esm.js';

export const Foo = {
  setup(props) {
    console.log(
      '在 Foo 组件中访问父组件传递到 setup 函数的 props：',
      props.msg
    );
  },
  render() {
    return h('p', {}, '我是子组件 Foo');
  },
};
