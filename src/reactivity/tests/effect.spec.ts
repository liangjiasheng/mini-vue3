import reactive from '../reactive';
import effect from '../effect';

describe('effect', () => {
  it("happy path", () => {
    const raw = {
      count: 1
    };

    let double;

    const observed = reactive(raw);

    effect(() => {
      double = observed.count * 2;
    });

    expect(double).toBe(2);

    observed.count++;

    expect(double).toBe(4);
  });
});