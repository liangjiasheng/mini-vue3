import { shallowReadonly } from '../reactivity/reactive';
import { proxyRefs } from '../reactivity/ref';
import { emit } from './componentEmit';
import { initProps } from './componentProps';
import { PublicInstanceProxyHandlers } from './componentPublicInstance';

export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    emit: () => {},
  };
  component.emit = emit.bind(null, component) as any;
  return component;
}

export function setupComponent(instance) {
  initProps(instance, instance.vnode.props);
  //! TODO 分别处理有状态组件与无状态组件（函数组件）
  setupStatefulComponent(instance);
}
function setupStatefulComponent(instance: any) {
  const component = instance.type;

  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);

  const { setup } = component;

  if (setup) {
    // 把父组件传递的属性 props 传给 setup 函数内部，并且需要使用 shallowReadonly 处理
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    });
    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance: any, setupResult: any) {
  //! TODO 分别处理 setup 返回值类型：object 和 function（ render 函数）
  if (typeof setupResult === 'object') {
    // 通过 proxyRefs 对返回值进行展开，如 result 中存在 ref，则访问是直接返回 ref.value
    instance.setupState = proxyRefs(setupResult);
  }
  finishSetupComponent(instance);
}

// 设置组件的 render 函数
function finishSetupComponent(instance: any) {
  const component = instance.type;
  //! TODO 分别处理直接在 component 中提供 render 函数和通过 template 编译成 render 函数两种情况
  if (component.render) {
    instance.render = component.render;
  }
}
