import { extend } from '../shared';

let activeEffect: ReactiveEffect;
let shouldTrack: boolean;

const targetMap = new Map();

class ReactiveEffect {
  private _fn: any;
  // 反向收集 effect 函数所关联的响应式数据依赖
  deps: any = [];
  // effect 状态标识，避免多次清除
  active = true;
  // stop cb
  onStop?: () => void;
  scheduler: Function | undefined;

  constructor(fn) {
    this._fn = fn;
  }

  run() {
    // 如果 effect 被 stop，那么后续再次执行时候，只是单纯的执行 effect 函数，而不进行依赖的收集
    if (!this.active) {
      return this._fn();
    }

    shouldTrack = true;
    // 把当前 this 指向全局变量，便于依赖收集
    activeEffect = this;
    // 开启 shouldTrack 后进行 effect 函数的调用，进行依赖的收集，接收结果
    const res = this._fn();
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

export function stop(runner) {
  runner.effect.stop();
}

function isTracking() {
  // activeEffect: 由于 track 时候收集的 activeEffect 是在 effect 函数中指向当前 effect 实例，如果单纯的访问响应式数据属性，则不存在 activeEffect
  // shouldTrack: 判断 effect 函数是否需要收集依赖
  return shouldTrack && activeEffect !== undefined;
}

export function track(target, key) {
  if (!isTracking()) return;
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
  // effect 首次执行，访问响应式数据，触发 getter， 进行依赖收集，收集的目标是当前执行的 effect函数，所以需要使用全局变量 activeEffect 存起来
  dep.add(activeEffect);
  // 反向收集 deps 到 effect 实例上，在调用 stop 后，循环遍历 effect 身上的 deps，把 effect 自身从 deps 中删掉
  activeEffect.deps.push(dep);
}

export function trigger(target, key) {
  // 根据 target & key 从 targetMap中取出收集到的依赖
  const depsMap = targetMap.get(target);
  const deps = depsMap.get(key);

  // 循环取出 key 收集到的 effect 并执行
  for (const effect of deps) {
    // 响应式数据更新时出发 trigger，如果存在调度任务，则执行，否则执行原 effect 函数
    if (effect.scheduler) {
      return effect.scheduler();
    }
    return effect.run();
  }
}

export default function effect(fn, options = {}) {
  // 抽象 ReactiveEffect 类，用来初始化和管理 effect，如后续用到的 stop 等
  const _effect = new ReactiveEffect(fn);

  // 合并配置项至 effect 实例上
  extend(_effect, options);

  // effect 函数首次执行一次
  _effect.run();

  // runner
  const runner: any = _effect.run.bind(_effect);

  // 反向挂载到 runner 上，操作 effect 函数返回的 runner，可以获取到自身 effect 实例
  runner.effect = _effect;

  return runner;
}
