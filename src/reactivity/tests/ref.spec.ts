import effect from '../effect';
import { reactive } from '../reactive';
import { ref, isRef, unRef, proxyRefs } from '../ref';

describe('ref', () => {
  it('happy path ', () => {
    const raw = ref(1);
    expect(raw.value).toBe(1);
  });

  it('reactive', () => {
    const raw = ref(1);
    let count;
    // 记录执行次数
    let calls = 0;
    effect(() => {
      calls++;
      count = raw.value;
    });
    expect(calls).toBe(1);
    expect(count).toBe(1);
    raw.value = 2;
    expect(calls).toBe(2);
    expect(count).toBe(2);
    // 赋相同值时，不触发 trigger
    raw.value = 2;
    expect(calls).toBe(2);
    expect(count).toBe(2);
  });

  it('nested', () => {
    // 当 ref 接收的参数为 object 时，会交由 reactive 做响应式处理
    const a = ref({
      count: 1,
    });
    let dummy;
    effect(() => {
      dummy = a.value.count;
    });
    expect(dummy).toBe(1);
    a.value.count = 2;
    expect(dummy).toBe(2);
  });

  it('isRef', () => {
    const a = ref(1);
    const user = reactive({
      age: 1,
    });
    expect(isRef(a)).toBe(true);
    expect(isRef(1)).toBe(false);
    expect(isRef(user)).toBe(false);
  });

  it('unRef', () => {
    // 当传入的参数为 ref，做拆箱处理，返回内部 value，否则直接返回参数自身
    const a = ref(1);
    expect(unRef(a)).toBe(1);
    expect(unRef(1)).toBe(1);
  });

  it('proxyRefs', () => {
    const user = {
      age: ref(10),
      name: 'liangjiasheng',
    };

    const proxyUser = proxyRefs(user);
    expect(user.age.value).toBe(10);
    expect(proxyUser.age).toBe(10);
    expect(proxyUser.name).toBe('liangjiasheng');

    proxyUser.age = 20;

    expect(proxyUser.age).toBe(20);
    expect(user.age.value).toBe(20);

    proxyUser.age = ref(10);
    expect(proxyUser.age).toBe(10);
    expect(user.age.value).toBe(10);
  });
});
