import reactive from '../reactive';

describe("reactive", () => {
  it("happy path", () => {
    const raw = {
      count: 1
    };

    const observed = reactive(raw);

    expect(observed.count).not.toBe(raw);

    expect(observed.count).toBe(1);

    observed.count++;

    expect(raw.count).toBe(2);
  });
});