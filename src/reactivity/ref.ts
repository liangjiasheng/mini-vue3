import { hasChanged, isObject } from '../shared';
import { isTracking, trackEffects, triggerEffects } from './effect';
import { reactive } from './reactive';

class RefImpl {
  private _value;
  public dep = new Set();
  private _rawValue;
  public __v_is_ref = true;
  constructor(value) {
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

export function isRef(value) {
  return !!value.__v_is_ref;
}

/* 
  拆箱，便于获取 ref 内部值
    1、ref -> ref.value
    2、primitive -> value
*/
export function unRef(ref) {
  return isRef(ref) ? ref.value : ref;
}

export function ref(value) {
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
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      return unRef(Reflect.get(target, key));
    },
    set(target, key, value) {
      if (isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value);
      } else {
        return Reflect.set(target, key, value);
      }
    },
  });
}
