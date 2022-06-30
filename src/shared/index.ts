export const extend = Object.assign;

export const EMPTY_OBJ = {};

export const isObject = (value: string) => {
  return value !== null && typeof value === 'object';
};

export const hasChanged = (val, newValue) => {
  return !Object.is(val, newValue);
};

export const hasOwn = (val, key) => {
  return Object.prototype.hasOwnProperty.call(val, key);
};

export const toHandleKey = (str: string) => {
  // AddFoo -> onAddFoo
  return str ? `on${capitalize(str)}` : '';
};

export const camelize = (str: string) => {
  // add-foo -> addFoo
  return str.replace(/-(\w)/g, (_, c: string) => {
    return c ? c.toUpperCase() : '';
  });
};

export const capitalize = (str: string) => {
  // addFoo -> AddFoo
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
};
