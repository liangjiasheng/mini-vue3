import { createRenderer } from '../../lib/guide-mini-vue.esm.js';
import { App } from './App.js';

const game = new PIXI.Application({
  width: 500,
  height: 500,
});

document.body.append(game.view);

// 自定义渲染器，传入底层渲染接口的配置项
const renderer = createRenderer({
  createElement(type) {
    if (type === 'rect') {
      const rect = new PIXI.Graphics();
      rect.beginFill(0xff0000);
      rect.drawRect(0, 0, 100, 100);
      rect.endFill();

      return rect;
    }
  },
  patchProp(el, key, val) {
    el[key] = val;
  },
  insert(el, parent) {
    parent.addChild(el);
  },
});

// game.stage 获取 canvas 的根节点
renderer.createApp(App).mount(game.stage);
