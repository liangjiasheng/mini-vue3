import { computed } from '../computed';
import { reactive } from '../reactive';

describe('computed', () => {
  it('happy path', () => {
    const raw = {
      count: 1,
    };

    const observed = reactive(raw);

    const cValue = computed(() => {
      return observed.count;
    });

    expect(cValue.value).toBe(1);
  });

  it('lazily', () => {
    const raw = {
      count: 1,
    };

    const observed = reactive(raw);

    const getter = jest.fn(() => {
      return observed.count;
    });

    // 传入 getter 返回 ComputedRefImpl 实例
    const cValue = computed(getter);

    // lazy: 调用 computed 时候不会执行 getter，当访问其计算属性 value 时候，才会执行
    expect(getter).not.toHaveBeenCalled();

    expect(cValue.value).toBe(1);
    expect(getter).toHaveBeenCalledTimes(1);

    // 单纯访问 value，没有涉及更新的话，直接返回缓存的计算属性，不做重新计算
    cValue.value; // get
    expect(getter).toHaveBeenCalledTimes(1);

    // 当 getter 中的响应式数据发生改变时，会开启 _dirty，后续访问计算属性时会进入到计算的逻辑
    observed.count = 2;
    expect(getter).toHaveBeenCalledTimes(1);

    // 当再次访问计算属性时，会进入计算逻辑，返回最新的值
    expect(cValue.value).toBe(2);
    expect(getter).toHaveBeenCalledTimes(2);

    cValue.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });
});
