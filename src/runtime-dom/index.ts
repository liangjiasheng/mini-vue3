import { createRenderer } from '../runtime-core/renderer';

// dom 层，组织浏览器渲染接口的实现

// 抽离底层稳定的渲染接口，不再依赖于具体的实现，如固定调用浏览器 dom api： document.xxx，以便后续更换不同的渲染平台，如 canvas
function createElement(type) {
  return document.createElement(type);
}

function patchProp(el, props) {
  for (const key in props) {
    const isOn = (event: string) => /^on[A-Z]/.test(event);
    if (isOn(key)) {
      // 截取事件名：onClick -> Click -> click
      const event = key.slice(2).toLocaleLowerCase();
      const handler = props[key];
      el.addEventListener(event, handler);
    } else {
      el.setAttribute(key, props[key]);
    }
  }
}

function insert(child, parent, anchor) {
  parent.appendChild(child, anchor || null);
}

// 对外暴露默认的 createApp 函数，通过底层默认的，也就是浏览器的渲染接口来创建默认渲染器提供给 createApp 调用
export const { createApp } = createRenderer({
  createElement,
  patchProp,
  insert,
});

// 依赖关系发生改变，默认导出 runtime-dom，而 runtime-dom（默认导出浏览器 dom 的运行时接口，可以自定义） 依赖 runtime-core（底层都依赖它创建内部的 render 函数） 来生成渲染器及应用启动的函数
export * from '../runtime-core';
