let activeEffect: ReactiveEffect;

const targetMap = new Map();

class ReactiveEffect {
  private _fn: any;

  constructor(fn) {
    this._fn = fn;
  }

  run() {
    // 把当前 this 指向全局变量，便于依赖收集
    activeEffect = this;
    this._fn();
  }
}

export function track(target, key) {
  // 追踪依赖，已存在，则收集，否则创建：targetMap -> target -> depsMap -> key -> deps
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let deps = depsMap.get[key];
  if (!deps) {
    // 依赖收集，去重，实用 Set
    deps = new Set();
    depsMap.set(key, deps);
  }
  if (!activeEffect) return;
  // effect 首次执行，访问响应式数据，触发 getter， 进行依赖收集，收集的目标是当前执行的 effect函数，所以需要使用全局变量 activeEffect 存起来
  deps.add(activeEffect);
}

export function trigger(target, key) {
  // 根据 target & key 从 targetMap中取出收集到的依赖
  const depsMap = targetMap.get(target);
  const deps = depsMap.get(key);

  // 循环取出 key 收集到的 effect 并执行
  for (const effect of deps) {
    effect.run();
  }
}

export default function effect(fn) {
  // 抽象 ReactiveEffect 类，用来初始化和管理 effect，如后续用到的 stop 等
  const effect = new ReactiveEffect(fn);

  // effect 函数首次执行一次
  effect.run();
};
