import pkg from './package.json';
import typescript from '@rollup/plugin-typescript';
export default {
  input: './src/index.ts',
  output: [
    /* 
      lib 输出多个版本
        -> cjs
        -> esm
    */
    {
      format: 'cjs',
      file: pkg.main,
    },
    {
      format: 'es',
      file: pkg.module,
    },
  ],

  plugins: [typescript()],
};
