import {
  h,
  ref,
  getCurrentInstance,
  nextTick,
} from "../../lib/guide-mini-vue.esm.js";

export default {
  name: "App",
  setup() {
    const count = ref(1);
    const instance = getCurrentInstance();

    function onClick() {
      for (let i = 0; i < 100; i++) {
        console.log("update");
        count.value = i;
      }

      // 在这个 case 中的更新步骤为
      // 1、点击按钮，回调执行 onClick 函数
      // 2、遍历对响应式数据进行了设置，触发了内部的 triggerEffect 逻辑
      // 3、把该组件 render 函数执行时候访问 count 时候收集的组件渲染逻辑取出来执行，进行更新
      // 4、由于组件实例的 update 函数，通过 effect 设置了第二个参数 scheduler，即当响应式数据发生改变时，不再执行传入的 fn 函数，而是执行配置的调度任务
      // 5、调度任务中，把组件的更新渲染任务加入到一个做了去重处理的任务队列里
      // 6、通过 nextTick 函数，实际内部是借助了 Promise.resolve.then 函数把更新任务队列放置到微任务中
      // 7、然后执行第一个 log，由于此时异步更新队列中的任务还未执行，所以获取到的组件实例中的数据还是旧的
      // 8、通过 nextTick 函数，把我们希望组件更新完成后执行的操作，也放置到异步队列中，排在组件异步更新任务的后面
      // 9、同步代码执行完毕后，event loop 会去微任务队列中取任务出来执行
      // 10、先把组件的更新任务，即 flushJobs 拿出来遍历内部 queue 中的任务执行各组件的更新
      // 11、然后去队列取我们通过 nextTick 放置在更新任务后面的函数出来执行
      // 12、此时我们放置的函数，执行 log 就可以获取到步骤10更新后的组件数据
      // debugger;
      console.log("同步执行，获取不到更新后的数据", instance);
      nextTick(() => {
        console.log(
          "放到异步渲染的队列后面执行，可以获取到最新的数据",
          instance
        );
      });

      // await nextTick()
      // console.log(instance)
    }

    return {
      onClick,
      count,
    };
  },
  render() {
    const button = h("button", { onClick: this.onClick }, "update");
    const p = h("p", {}, "count:" + this.count);

    return h("div", {}, [button, p]);
  },
};
