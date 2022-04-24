import reactive from '../reactive';
import effect, { stop } from '../effect';

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

  it('runner', () => {
    // 1、effect 函数传入的 fn 执行，然后返回函数 runner
    // 2、runner 是绑定了 effect 实例自身的 fn 参数
    // 3、执行 runner，等同于再次执行 fn 函数，返回结果
    const runner = effect(() => {
      return 1 + 1;
    });

    const res = runner();

    expect(res).toBe(2);
  });

  it('scheduler', () => {
    let count;

    const raw = {
      count: 1,
    };

    const observed = reactive(raw);

    const scheduler = jest.fn(() => {
      count = observed.count * 2;
    });

    const runner = effect(
      () => {
        count = observed.count + 1;
      },
      {
        scheduler,
      }
    );

    expect(scheduler).not.toHaveBeenCalled();

    // init -> run effect fn
    expect(count).toBe(2);

    // update -> run scheduler fn
    observed.count++;

    // 响应式数据更新，触发 trigger 后，执行的是 scheduler，而不是 effect fn
    expect(scheduler).toHaveBeenCalledTimes(1);

    expect(count).toBe(4);

    runner();

    expect(count).toBe(3);
  });

  it('stop', () => {
    let count;

    const raw = {
      count: 1,
    };

    const observed = reactive(raw);

    const runner = effect(() => {
      count = observed.count;
    });

    observed.count = 2;

    expect(count).toBe(2);

    stop(runner);

    observed.count = 3;

    expect(count).toBe(2);
  });

  it('onStop', () => {
    // effect stop 后的 callback

    let count;

    const raw = {
      count: 1,
    };

    const observed = reactive(raw);

    const onStop = jest.fn();

    const runner = effect(
      () => {
        count = observed.count + 1;
      },
      {
        onStop,
      }
    );

    stop(runner);

    expect(onStop).toBeCalledTimes(1);
  });
});
