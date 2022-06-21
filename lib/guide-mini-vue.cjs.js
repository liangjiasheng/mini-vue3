'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
// 创建虚拟节点，也就是平时在 render 函数中使用的 h 函数
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag: getShapeFlag(type),
    };
    // 通过 children 来判断 vnode 子节点是文本还是数组元素
    if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ARRAY_CHILDREN */;
    }
    else if (typeof children === 'string') {
        vnode.shapeFlag |= 4 /* TEXT_CHILDREN */;
    }
    // 通过 vnode 是有状态组件并且其 children 是对象来判断其拥有 slots
    if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        if (typeof children === 'object') {
            vnode.shapeFlag |= 16 /* SLOT_CHILDREN */;
        }
    }
    return vnode;
}
// 由于 children 数组中只允许存在 vnode，不支持直接传入纯文本，所以需要引入 Text 类型特殊处理，只创建一个文本节点
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
// 初始化 vnode shapeFlag 属性
function getShapeFlag(type) {
    // 通过 type 来判断 vnode 的类型是标签元素还是组件
    return typeof type === 'string'
        ? 1 /* ELEMENT */
        : 2 /* STATEFUL_COMPONENT */;
}

const extend = Object.assign;
const isObject = (value) => {
    return value !== null && typeof value === 'object';
};
const hasOwn = (val, key) => {
    return Object.prototype.hasOwnProperty.call(val, key);
};
const toHandleKey = (str) => {
    // AddFoo -> onAddFoo
    return str ? `on${capitalize(str)}` : '';
};
const camelize = (str) => {
    // add-foo -> addFoo
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : '';
    });
};
const capitalize = (str) => {
    // addFoo -> AddFoo
    return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
};

const targetMap = new Map();
function trigger(target, key) {
    // 根据 target & key 从 targetMap中取出收集到的依赖
    const depsMap = targetMap.get(target);
    const deps = depsMap.get(key);
    triggerEffects(deps);
}
function triggerEffects(dep) {
    // 循环取出 key 收集到的 effect 并执行
    for (const effect of dep) {
        // 响应式数据更新时出发 trigger，如果存在调度任务，则执行，否则执行原 effect 函数
        if (effect.scheduler) {
            return effect.scheduler();
        }
        return effect.run();
    }
}

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, isShallow = false) {
    return function (target, key) {
        // 通过 key 值返回相应的 isReadonly 值给到 isReadonly/isReactive 进行判断
        if (key === "__v_is_reactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_is_readonly" /* IS_READONLY */) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        // 只处理最外层，嵌套的直接返回结果
        if (isShallow)
            return res;
        // 递归对嵌套的数据进行响应式处理
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function (target, key, value) {
        const res = Reflect.set(target, key, value);
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`${target} 是 readonly，${key} 的值不允许设置为新值：${value}`);
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers);
}
// 可以尝试抽离 return new Proxy 这种低代码，使其更有语义化
function createActiveObject(target, baseHandlers) {
    return new Proxy(target, baseHandlers);
}

function isRef(value) {
    return !!value.__v_is_ref;
}
/*
  拆箱，便于获取 ref 内部值
    1、ref -> ref.value
    2、primitive -> value
*/
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
/*
  对含有 refs 值的对象进行代理
  get: 调用 unRef 获取 value（兼容 value 为 ref 或者 primitive 的情况）
    1、ref: 进行拆箱，取出内部 value 值进行返回
    2、value: 直接返回
  set: 调用 isRef 对新旧值做判断
    1、oldValue 为 ref，而 value 为 primitive，则更新 ref 为新值 value
    2、重新设置该属性值为 value
*/
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                return Reflect.set(target, key, value);
            }
        },
    });
}

function emit(instance, event, ...args) {
    const { props } = instance;
    const handlerName = toHandleKey(camelize(event));
    const handler = props[handlerName];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

// 在 render 上下文中平时还会访问到诸如：$data, $props, $slots 等属性，可以统一整合代理到上下文中以便访问
const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
};
// 负责处理 component 各项数据代理到 render 函数的上下文中，在 render 内部通过 this 直接访问
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function initSlots(instance, children) {
    const { vnode } = instance;
    // 判断当前 vnode 为有状态组件且其拥有 slots
    if (vnode.shapeFlag & 16 /* SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        // 把组件的 children 挂载到组件实例上的 slots，并将其处理封装统一处理成函数的形式，可以支持组件调用时传入自身内部属性 props 供外部使用
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    // 由于 render patch 渲染内容的时候只支持数组形式的 children，所以需要兼容处理 slot 函数返回的 vnode
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        emit: () => { },
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    //! TODO 分别处理有状态组件与无状态组件（函数组件）
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
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
function handleSetupResult(instance, setupResult) {
    //! TODO 分别处理 setup 返回值类型：object 和 function（ render 函数）
    if (typeof setupResult === 'object') {
        // 通过 proxyRefs 对返回值进行展开，如 result 中存在 ref，则访问是直接返回 ref.value
        instance.setupState = proxyRefs(setupResult);
    }
    finishSetupComponent(instance);
}
// 设置组件的 render 函数
function finishSetupComponent(instance) {
    const component = instance.type;
    //! TODO 分别处理直接在 component 中提供 render 函数和通过 template 编译成 render 函数两种情况
    if (component.render) {
        instance.render = component.render;
    }
}

function render(vnode, container) {
    patch(vnode, container);
}
// patch 函数，负责处理 component 和 element 在 mount 和 update 阶段的一系列工作，单独抽离 patch 函数，是为了后面处理 children 时候递归调用
function patch(vnode, container) {
    const { shapeFlag, type } = vnode;
    // 处理特殊类型如 Fragment，Text和普通类型如标签元素，组件
    switch (type) {
        case Fragment:
            processFragment(vnode, container);
            break;
        case Text:
            processText(vnode, container);
            break;
        default:
            // 通过 if/ else 检测 vnode 或 children 是什么类型来判断渲染的方式（通过访问对象内属性来判断）比较低效，考虑到性能问题，可以借助位运算的方式进行优化（可读性 vs 性能）
            if (shapeFlag & 1 /* ELEMENT */) {
                processElement(vnode, container);
            }
            else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                processComponent(vnode, container);
            }
            break;
    }
}
function processFragment(vnode, container) {
    const { children } = vnode;
    mountChildren(children, container);
}
function processText(vnode, container) {
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.appendChild(textNode);
}
function processElement(vnode, container) {
    //! TODO 分别处理 mount 和 update 流程
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    // vnode 是标签元素的情况下：绑定当前根元素到 vnode 上
    const el = (vnode.el = document.createElement(vnode.type));
    const { props, children } = vnode;
    // children 支持文本 string 类型与子元素 array 类型
    if (vnode.shapeFlag & 4 /* TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (vnode.shapeFlag & 8 /* ARRAY_CHILDREN */) {
        mountChildren(children, el);
    }
    for (const key in props) {
        const isOn = (event) => /^on[A-Z]/.test(event);
        if (isOn(key)) {
            // 截取事件名：onClick -> Click -> click
            const event = key.slice(2).toLocaleLowerCase();
            const handler = props[key];
            el.addEventListener(event, handler);
        }
        else {
            el.setAttribute(key, props[key]);
        }
    }
    container.appendChild(el);
}
// 利用 patch 函数递归处理 children 中的 vnode
function mountChildren(children, el) {
    children.forEach((v) => {
        patch(v, el);
    });
}
function processComponent(vnode, container) {
    //! TODO 分别处理 mount 和 update 流程
    mountComponent(vnode, container);
}
function mountComponent(vnode, container) {
    /*
      1、初始化 component 实例
      2、设置 component 实例的各项数据，如 props, slots, proxy等等
      3、调用 render 函数获取 subTree
    */
    const instance = createComponentInstance(vnode);
    setupComponent(instance);
    setupRenderEffect(instance, container);
}
function setupRenderEffect(instance, container) {
    // 由于可以在 render 函数中可以通过 this 访问到诸如 component setup 结果或实例上属性等，所以需要把各项数据代理到 render 函数的上下文中
    const subTree = instance.render.call(instance.proxy);
    patch(subTree, container);
    /*
      1、在 mountElement 步骤中创建根元素并赋值到 vnode 的 el 属性上
      2、component 类型没有经过 mountElement 步骤，所以需要在最后处理完内部所有元素或组件后，把 render 函数返回的 vnode 上的 el 赋值给组件实例上
    */
    instance.vnode.el = subTree.el;
}

// entry，接收根组件参数，通过 mount 函数，先把根组件转成 vnode，然后渲染到指定的容器中
function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // 首先需要把 rootComponent 转换成 vnode，后面的一系列操作，都是基于 vnode 工作
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
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

exports.createApp = createApp;
exports.createTextVNode = createTextVNode;
exports.h = h;
exports.renderSlots = renderSlots;
