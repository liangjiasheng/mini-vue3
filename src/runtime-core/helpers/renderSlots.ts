import { createVNode, Fragment } from '../vnode';

export function renderSlots(slots, name, props) {
  // 通过模板中 v-slot 指定的名字，在模板编译后，也就是 render 函数中通过 createVNode 创建组件时传入的第三个对象参数中，找到插槽名字所匹配的渲染内容
  const slot = slots[name];

  if (slot) {
    // 由于需要支持作用域插槽传递参数的使用，所以需要在 initSlots 的时候将其处理成函数
    if (typeof slot === 'function') {
      // 把组件内部调用时候传递进来的自身属性 props 作为参数，传进 slot 中，获取渲染的内容
      // 由于 children 只允许为 array，所以实际需要渲染的 slot 内容也是 array，所以没必要在外部多包一层 div，可以引入 Fragment 来做特殊判断，只渲染 children
      return createVNode(Fragment, {}, slot(props));
    }
  }
}
