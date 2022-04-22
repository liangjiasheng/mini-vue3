import reactive from '../reactive';
import effect from '../effect';

describe('effect', () => {
  it('happy path', () => {
    const raw = {
      count: 1,
    };

    let double;

    const observed = reactive(raw);

    effect(() => {
      // init -> get -> track
      double = observed.count * 2;
    });

    // effect 首次执行，访问响应式数据，触发依赖收集，赋值 double
    expect(double).toBe(2);

    // update -> set -> trigger -> effect
    observed.count++;

    // 响应式数据更新后，重新执行 effect 函数
    expect(double).toBe(4);
  });
});
