export const extend = Object.assign;

export const isObject = (value: string) => {
  return value !== null && typeof value === 'object';
};
