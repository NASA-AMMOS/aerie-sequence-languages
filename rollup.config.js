import typescript from '@rollup/plugin-typescript';
import { lezer } from '@lezer/generator/rollup';

export default {
  input: './src/index.ts',
  output: [
    {
      format: 'es',
      file: './dist/index.js',
      sourcemap: true,
    },
    {
      format: 'cjs',
      file: './dist/index.cjs',
      sourcemap: true,
    },
  ],
  external: ['@lezer/lr'],
  plugins: [lezer(), typescript({ tsconfig: './tsconfig.json' })],
};
