import { getCurrentInstance } from './component';

export function provide(key, value) {
  // 获取当前组件实例
  const currentInstance: any = getCurrentInstance();

  if (currentInstance) {
    // 获取当前组件的父级组件来获取父级组件注入的数据
    const { parent } = currentInstance;
    // 判断是否处于初始化阶段，由于在 component.ts 中根据是否拥有 parent 来给 provides 赋值
    if (currentInstance.provides === parent.provides) {
      // 初始化阶段，组件上的 provides 等于父级的 provides
      // 从访问的行为上可以得出，孙子组件注入时候，如果在父级存在，则返回，如果不存在，则往父级的父级上找，以此类推，所以可以类比到原型链上，基于父级的 provides 作为原型给当前组件实例再次进行初始化操作
      currentInstance.provides = Object.create(parent.provides);
    }
    currentInstance.provides[key] = value;
  }
}

export function inject(key, defaultValue) {
  const currentInstance: any = getCurrentInstance();

  if (currentInstance) {
    const { parent } = currentInstance;
    // 当前组件注入的数据，往其父级上找，以此类推
    if (key in parent.provides) {
      return parent.provides[key];
    } else if (defaultValue) {
      // 提供默认值，支持函数方式
      if (typeof defaultValue === 'function') {
        return defaultValue();
      }
      return defaultValue;
    }
  }
}
