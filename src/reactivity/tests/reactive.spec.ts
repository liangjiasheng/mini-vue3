import { isReactive, reactive } from '../reactive';

describe('reactive', () => {
  it('happy path', () => {
    const raw = {
      count: 1,
    };

    // raw -> proxy
    const observed = reactive(raw);

    expect(observed.count).not.toBe(raw);

    expect(observed.count).toBe(1);

    // update -> set
    observed.count++;

    expect(raw.count).toBe(2);
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
});
