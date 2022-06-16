import { h } from '../../lib/guide-mini-vue.esm.js';
import { Foo } from './Foo.js';

window.self = null;
export const App = {
  render() {
    // 控制台输出当前上下文的属性，便于查看
    window.self = this;
    return h(
      'div',
      {
        id: 'root',
        class: ['red', 'blue'],
        onClick() {
          // console.log('click');
        },
        onMousedown() {
          // console.log('mousedown');
        },
      },
      // string
      //       `${this.msg} by ljs`
      // array
      [
        h('div', { class: 'red' }, `${this.msg} by ljs`),
        h('div', { class: 'blue' }, `${this.msg} by ljs`),
        h(Foo, {
          msg: '这是从父组件 App 传递给子组件 Foo 的属性',
          onAdd: function (msg) {
            console.log(
              `父组件 App 接收到子组件 Foo 通过 emit 传递出来的消息：${msg}`
            );
          },
          onAddFoo: function (msg) {
            console.log(msg);
          },
        }),
      ]
    );
  },
  setup() {
    return {
      msg: 'hello mini-vue3',
    };
  },
};
