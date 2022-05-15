// 创建虚拟节点，也就是平时在 render 函数中使用的 h 函数
function createVNode(type, props, children) {
    return {
        type,
        props,
        children,
    };
}

const extend = Object.assign;
const isObject = (value) => {
    return value !== null && typeof value === 'object';
};
const hasOwn = (val, key) => {
    return Object.prototype.hasOwnProperty.call(val, key);
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
extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
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

// 负责处理 component 各项数据代理到 render 函数的上下文中，在 render 内部通过 this 直接访问
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
    },
};

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
    };
    return component;
}
function setupComponent(instance) {
    //! TODO 分别处理有状态组件与无状态组件（函数组件）
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const component = instance.type;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = component;
    if (setup) {
        const setupResult = setup();
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
    //! TODO 分别处理 component 和 element 流程
    if (typeof vnode.type === 'string') {
        processElement(vnode, container);
    }
    else if (isObject(vnode.type)) {
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    //! TODO 分别处理 mount 和 update 流程
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const el = document.createElement(vnode.type);
    const { props, children } = vnode;
    // children 支持文本 string 类型与子元素 array 类型
    if (typeof children === 'string') {
        el.textContent = children;
    }
    else if (Array.isArray(children)) {
        mountChildren(children, el);
    }
    for (const key in props) {
        el.setAttribute(key, props[key]);
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

export { createApp, h };
