import { isReadonly, readonly } from '../reactive';

describe('readonly', () => {
  it('happy path', () => {
    const raw = {
      count: 1,
    };

    const wrapped = readonly(raw);

    expect(wrapped).not.toBe(raw);

    expect(wrapped.count).toBe(1);
  });

  it('set readonly value', () => {
    // 改变 readonly 值报错
    const raw = {
      count: 1,
    };

    // mock 输出警告
    console.warn = jest.fn();

    const wrapped = readonly(raw);

    wrapped.count++;

    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('is readonly', () => {
    // 判断对象是否为 readonly
    const raw = {
      count: 1,
    };
    const wrapped = readonly(raw);

    expect(isReadonly(wrapped)).toBe(true);

    expect(isReadonly(raw)).toBe(false);
  });
});
