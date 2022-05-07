import { isProxy, isReactive, reactive } from '../reactive';

describe('reactive', () => {
  it('happy path', () => {
    const raw = {
      count: 1,
    };

    // raw -> proxy
    const observed = reactive(raw);

    expect(observed).not.toBe(raw);

    expect(observed.count).toBe(1);
  });

  it('is reactive', () => {
    // 判断对象是否为 reactive
    const raw = {
      count: 1,
    };

    const observed = reactive(raw);

    expect(isReactive(raw)).toBe(false);

    expect(isReactive(observed)).toBe(true);
  });

  it('nested', () => {
    const raw = {
      count: 1,
      nested: {
        count: 1,
      },
    };
    const observed = reactive(raw);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(observed.nested)).toBe(true);
    expect(isProxy(observed)).toBe(true);
  });
});
