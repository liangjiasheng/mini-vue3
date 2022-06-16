import { h } from '../../lib/guide-mini-vue.esm.js';

export const Foo = {
  setup(props, { emit }) {
    console.log(
      '在 Foo 组件中访问父组件传递到 setup 函数的 props：',
      props.msg
    );
    const emitAdd = (params) => {
      console.log('子组件 Foo 调用 emit 传递消息');
      emit('add', '我是子组件 Foo emit 出来的值');
      emit('add-foo', '支持事件名连字符写法');
    };
    return {
      emitAdd,
    };
  },
  render() {
    const btn = h(
      'button',
      {
        onClick: this.emitAdd,
      },
      'emitAdd'
    );
    const foo = h('p', {}, 'foo');
    return h('p', {}, [btn, foo]);
  },
};
