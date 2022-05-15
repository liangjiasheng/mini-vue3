import { h } from '../../lib/guide-mini-vue.esm.js';

export const App = {
  render() {
    return h(
      'div',
      {
        id: 'root',
        class: ['red', 'blue'],
      },
      // string
      //       `${this.msg} by ljs`
      // array
      [
        h('div', { class: 'red' }, `${this.msg} by ljs`),
        h('div', { class: 'blue' }, `${this.msg} by ljs`),
      ]
    );
  },
  setup() {
    return {
      msg: 'hello mini-vue3',
    };
  },
};
