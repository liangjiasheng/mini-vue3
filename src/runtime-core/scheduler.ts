const queue: any[] = [];
const p = Promise.resolve();
let isFlushPending = false;

export function queueJobs(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }
  queueFlush();
}

export function nextTick(fn) {
  // 借助 Promise 把更新任务及我们外部希望在更新任务后面执行的操作放置到微任务队列中
  return fn ? p.then(fn) : p;
}

function queueFlush() {
  if (isFlushPending) return;
  isFlushPending = true;
  // 通过 nextTick 把更新任务放置到微任务队列中
  nextTick(flushJobs);
}

function flushJobs() {
  // 遍历执行各个更新渲染任务
  let job;
  while ((job = queue.shift())) {
    job && job();
  }
}
