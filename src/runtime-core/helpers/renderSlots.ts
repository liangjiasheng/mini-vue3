import { createVNode, Fragment } from '../vnode';

export function renderSlots(slots, name, props) {
  // 通过模板中 v-slot 指定的名字，编译后，模板上的 slot 标签会被转换成 renderSlots 函数，然后传入组件实例上的 slots（也就是父组件调用时，模板中组件标签包裹的内容，或者说 render 函数传递给当前组件的 children）和插槽名以及自身 props
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
