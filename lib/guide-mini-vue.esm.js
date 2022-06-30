const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (value) => {
    return value !== null && typeof value === 'object';
};
const hasChanged = (val, newValue) => {
    return !Object.is(val, newValue);
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

let activeEffect;
let shouldTrack;
const targetMap = new Map();
class ReactiveEffect {
    constructor(fn, scheduler) {
        // 反向收集 effect 函数所关联的响应式数据依赖
        this.deps = [];
        // effect 状态标识，避免多次清除
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        // 如果 effect 被 stop，那么后续再次执行时候，只是单纯的执行 effect 函数，而不进行依赖的收集
        if (!this.active) {
            return this._fn();
        }
        // effect 包裹下开启 shouldTrack，当访问响应式数据时候触发 getter 中的 track 才会进行依赖的收集
        shouldTrack = true;
        // 把当前 this 指向全局变量，便于依赖收集
        activeEffect = this;
        // 开启 shouldTrack 后进行 effect 函数的调用，进行依赖的收集，接收结果
        const res = this._fn();
        // reset
        shouldTrack = false;
        return res;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    // 优化：遍历从各个 deps 中移除 effect 实例自身后，重置清零 deps
    effect.deps.length = 0;
}
function isTracking() {
    // activeEffect: 由于 track 时候收集的 activeEffect 是在 effect 函数中指向当前 effect 实例，如果单纯的访问响应式数据属性，则不存在 activeEffect
    // shouldTrack: 判断 effect 函数是否需要收集依赖
    return shouldTrack && activeEffect !== undefined;
}
function track(target, key) {
    if (!isTracking())
        return;
    // 追踪依赖，已存在，则收集，否则创建：targetMap -> target -> depsMap -> key -> deps
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get[key];
    if (!dep) {
        // 依赖收集，去重，实用 Set
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    // 检查 effect 是否已存在，避免重复添加
    if (dep.has(activeEffect))
        return;
    // effect 首次执行，访问响应式数据，触发 getter， 进行依赖收集，收集的目标是当前执行的 effect函数，所以需要使用全局变量 activeEffect 存起来
    dep.add(activeEffect);
    // 反向收集 deps 到 effect 实例上，在调用 stop 后，循环遍历 effect 身上的 deps，把 effect 自身从 deps 中删掉
    activeEffect.deps.push(dep);
}
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
function effect(fn, options = {}) {
    // 抽象 ReactiveEffect 类，用来初始化和管理 effect，如后续用到的 stop 等
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // 合并配置项至 effect 实例上
    extend(_effect, options);
    // effect 函数首次执行一次
    _effect.run();
    // runner
    const runner = _effect.run.bind(_effect);
    // 反向挂载到 runner 上，操作 effect 函数返回的 runner，可以获取到自身 effect 实例
    runner.effect = _effect;
    return runner;
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
        !isReadonly && track(target, key);
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

class RefImpl {
    constructor(value) {
        this.dep = new Set();
        this.__v_is_ref = true;
        this._value = convert(value);
        this._rawValue = value;
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        // 新旧值无变化，则不做更新处理，也不触发 trigger
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerEffects(this.dep);
        }
    }
}
function trackRefValue(ref) {
    isTracking() && trackEffects(ref.dep);
}
/*
  判断 ref 接收的参数：
  object -> reactive(value)
  primitive -> value
*/
function convert(value) {
    return isObject(value) ? reactive(value) : value;
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
function ref(value) {
    return new RefImpl(value);
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
        // 把组件的 children 挂载到组件实例上的 slots，并将其处理统一封装成函数的形式，可以支持组件调用时传入自身内部属性 props 供外部使用
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    // 由于 render patch 渲染内容的时候只支持数组形式的 children，所以需要兼容处理 slot 函数返回的 vnode
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        parent,
        subTree: {},
        isMounted: false,
        provides: parent ? parent.provides : {},
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
        // 只允许在 setup 函数中使用 getCurrentInstance 来获取到组件的实例对象
        setCurrentInstance(instance);
        // 把父组件传递的属性 props 传给 setup 函数内部，并且需要使用 shallowReadonly 处理
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
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
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
// 创建虚拟节点，也就是平时在 render 函数中使用的 h 函数
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        key: props && props.key,
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

// 由于 createApp 不再是裸着导出去使用了，而是依赖于 render 函数，所以需要包装一层，提供 createRenderer 函数供自定义/默认渲染器，然后再创建应用启动函数
function createAppAPI(render) {
    // entry，接收根组件参数，通过 mount 函数，先把根组件转成 vnode，然后渲染到指定的容器中
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 首先需要把 rootComponent 转换成 vnode，后面的一系列操作，都是基于 vnode 工作
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

// 对外提供自定义渲染器的接口，接收底层渲染接口作为参数，返回使用自定义渲染器的 createApp 函数
function createRenderer(options) {
    // 重命名 host 便于出错后排查，与底层默认的浏览器渲染接口区分开
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, setElementText: hostSetElementText, remove: hostRemove, } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null);
    }
    // patch 函数，负责处理 component 和 element 在 mount 和 update 阶段的一系列工作，单独抽离 patch 函数，是为了后面处理 children 时候递归调用
    function patch(n1, n2, container, parent, anchor) {
        const { shapeFlag, type } = n2;
        // 处理特殊类型如 Fragment，Text 和普通类型如标签元素，组件
        switch (type) {
            case Fragment:
                processFragment(n2, container, parent);
                break;
            case Text:
                processText(n2, container);
                break;
            default:
                // 通过 if/ else 检测 n1, n2 或 children 是什么类型来判断渲染的方式（通过访问对象内属性来判断）比较低效，考虑到性能问题，可以借助位运算的方式进行优化（可读性 vs 性能）
                if (shapeFlag & 1 /* ELEMENT */) {
                    processElement(n1, n2, container, parent);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parent);
                }
                break;
        }
    }
    function processFragment(vnode, container, parent, anchor) {
        const { children } = vnode;
        mountChildren(children, container, parent);
    }
    function processText(vnode, container) {
        const { children } = vnode;
        const textNode = (vnode.el = document.createTextNode(children));
        container.appendChild(textNode);
    }
    function processElement(n1, n2, container, parent, anchor) {
        // 根据是否存在老节点（已挂载后）来判断当前走 mount 流程还是 update 流程
        if (!n1) {
            mountElement(n2, container, parent);
        }
        else {
            patchElement(n1, n2, container, parent);
        }
    }
    function mountElement(vnode, container, parent, anchor) {
        // vnode 是标签元素的情况下：绑定当前根元素到 vnode 上
        // const el = (vnode.el = document.createElement(vnode.type));
        const el = (vnode.el = hostCreateElement(vnode.type));
        const { props, children, shapeFlag } = vnode;
        // children 支持文本 string 类型与子元素 array 类型
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
            mountChildren(children, el, parent);
        }
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        // container.appendChild(el);
        hostInsert(el, container);
    }
    function patchElement(n1, n2, container, parent, anchor) {
        console.log('patchElement', n1, n2);
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        const el = (n2.el = n1.el);
        // 元素的更新：
        //   值
        //   子节点
        patchProps(el, oldProps, newProps);
        patchChildren(n1, n2, el, parent);
    }
    function patchChildren(n1, n2, container, parent, anchor) {
        const { children: c1, shapeFlag: s1 } = n1;
        const { children: c2, shapeFlag: s2 } = n2;
        if (s1 & 4 /* TEXT_CHILDREN */) {
            if (s2 & 4 /* TEXT_CHILDREN */) {
                // old 子节点是文本，new 子节点也是文本，如果值不同，则更新 container 文本节点的内容
                if (c1 !== c2) {
                    hostSetElementText(container, c2);
                }
            }
            else {
                // old 子节点是文本，new 子节点是数组，则把 container 下的 old 文本节点置空后，把 new 子节点挂载到 container 上
                hostSetElementText(container, '');
                mountChildren(c2, container, parent);
            }
        }
        else {
            if (s2 & 4 /* TEXT_CHILDREN */) {
                // old 子节点是数组，new 子节点是文本，则把 container 下的 old 子节点卸载，把 new 子节点的文本内容设置到 container 上
                unmountChildren(c1);
                hostSetElementText(container, c2);
            }
            else {
                // old 子节点是数组，new 子节点也是数组，则需要对二者进行 diff 操作，比对找出需要更新的子节点
                console.log('diff 新旧 children');
                patchKeyedChildren(c1, c2, container, parent);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parent, anchor) {
        let i = 0; // 指向 n2 开头的位置
        let e1 = c1.length - 1;
        let e2 = c2.length - 1;
        function isSameNode(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSameNode(n1, n2)) {
                patch(n1, n2, container, parent);
            }
            else {
                break;
            }
            i++;
        }
        console.log('左侧比对完，此时的i：', i);
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSameNode(n1, n2)) {
                patch(n1, n2, container, parent);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        console.log('右侧比对完，此时的i：', i);
    }
    function unmountChildren(childs) {
        childs.forEach((child) => {
            hostRemove(child.el);
        });
    }
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            for (const key in newProps) {
                const prevVal = oldProps[key];
                const nextVal = newProps[key];
                if (prevVal !== nextVal) {
                    hostPatchProp(el, key, prevVal, nextVal);
                }
            }
            if (oldProps !== EMPTY_OBJ) {
                for (const key in oldProps) {
                    // old 有而 new 没有的属性，移除
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    // 利用 patch 函数递归处理 children 中的 vnode
    function mountChildren(children, el, parent, anchor) {
        children.forEach((v) => {
            patch(null, v, el, parent);
        });
    }
    function processComponent(n1, n2, container, parent, anchor) {
        //! TODO 分别处理 mount 和 update 流程
        if (!n1) {
            mountComponent(n2, container, parent);
        }
        else {
            console.log('component 更新逻辑');
        }
    }
    function mountComponent(initialVNode, container, parent, anchor) {
        /*
          1、初始化 component 实例
          2、设置 component 实例的各项数据，如 props, slots, proxy等等
          3、调用 render 函数获取 subTree
        */
        const instance = createComponentInstance(initialVNode, parent);
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container);
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        // 响应式数据改变 -> 重新执行 render 函数 -> 根据改变后的数据重新生成 subTree，然后通过 patch 进行更新
        effect(() => {
            // 标识组件实例是否已挂载
            if (!instance.isMounted) {
                console.log('component init');
                // 由于可以在 render 函数中可以通过 this 访问到诸如 component setup 结果或实例上属性等，所以需要把各项数据代理到 render 函数的上下文中
                const { proxy } = instance;
                const subTree = instance.render.call(proxy);
                instance.subTree = subTree;
                patch(null, subTree, container, instance);
                /*
                  1、在 mountElement 步骤中创建根元素并赋值到 vnode 的 el 属性上
                  2、component 类型没有经过 mountElement 步骤，所以需要在最后处理完内部所有元素或组件后，把 render 函数返回的 vnode 上的 el 赋值给组件实例上
                */
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                console.log('component update');
                const { proxy } = instance;
                // 重新执行 render，生成新的 subTree 后，重新赋值到 instance 上，并调用 patch 函数进行更新
                const subTree = instance.render.call(proxy);
                const prevTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevTree, subTree, container, instance);
            }
        });
    }
    return {
        createApp: createAppAPI(render),
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
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

function provide(key, value) {
    // 获取当前组件实例
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        // 获取当前组件的父级组件来获取父级组件注入的数据
        const { parent } = currentInstance;
        // 判断是否处于初始化阶段，由于在 component.ts 中根据是否拥有 parent 来给 provides 赋值
        if (currentInstance.provides === parent.provides) {
            // 初始化阶段，组件上的 provides 等于父级的 provides
            // 从访问的行为上可以得出，孙子组件注入时候，如果在父级存在，则返回，如果不存在，则往父级的父级上找，以此类推，所以可以类比到原型链上，基于父级的 provides 作为原型给当前组件实例再次进行初始化操作
            currentInstance.provides = Object.create(parent.provides);
        }
        currentInstance.provides[key] = value;
    }
}
function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const { parent } = currentInstance;
        // 当前组件注入的数据，往其父级上找，以此类推
        if (key in parent.provides) {
            return parent.provides[key];
        }
        else if (defaultValue) {
            // 提供默认值，支持函数方式
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

// dom 层，组织浏览器渲染接口的实现
// 抽离底层稳定的渲染接口，不再依赖于具体的实现，如固定调用浏览器 dom api： document.xxx，以便后续更换不同的渲染平台，如 canvas
function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, props) {
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
}
function insert(child, parent, anchor) {
    parent.appendChild(child, anchor || null);
}
// 对外暴露默认的 createApp 函数，通过底层默认的，也就是浏览器的渲染接口来创建默认渲染器提供给 createApp 调用
const { createApp } = createRenderer({
    createElement,
    patchProp,
    insert,
});

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, isRef, provide, proxyRefs, ref, renderSlots, unRef };
