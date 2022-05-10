import { ReactiveEffect } from './effect';

class ComputedRefImpl {
  private _value;
  private _effect;
  private _dirty = true;
  constructor(getter) {
    /*
      借助 effect 类实现以下两点:
	1、惰性执行，调用 computed 传入的参数 getter 首次不会立即执行
	2、脏数据标识（即是否使用缓存）
	  1): init -> 初次获取 value 时候，执行 _effct 的 run 方法，即外部传入 computed 中的 getter 参数后把关闭 _dirty ，后续如果 getter 中响应式数据没有更新的话，再次访问计算属性，得到的还是缓存的值，即上一次 getter 执行计算返回的值
	  2): update -> 响应式数据更新后，触发 trigger，而由于我们构造的 ReactiveEffect 实例传入了第二个参数 scheduler 配置了调度任务，所以 trigger 后执行的是 effect 实例的 scheduler 函数，开启了 _dirty，而后再次访问计算属性时候，就会再次进入到 _effect.run 逻辑，重新计算返回最新值
     */
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
      }
    });
  }
  /* 
    _dirty: 判断 getter 中的响应式数据是否有更新
      true -> 调用 computed 接收的函数参数 getter，赋值给 _value
      false -> getter 中的响应式数据没有变动，不需要重新执行计算，返回上一次的值即可
  */
  get value() {
    if (this._dirty) {
      this._dirty = false;
      this._value = this._effect.run();
    }
    return this._value;
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter);
}
