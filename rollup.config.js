import pkg from './package.json';

import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
//import { uglify } from 'rollup-plugin-uglify';

export default [
  // UMD bundle, prod-friendly but not minified
  {
    input: pkg.entry,
    output: {
      file: pkg.main,
      name: pkg.name,
      sourcemap: false,
      format: 'umd',
    },

    plugins: [
      resolve({
        preferBuiltins: false
      }),
      commonjs(),
      globals(),
      builtins(),
    ]
  },



  /*
  // UMD bundle, prod-friendly but minified
  {
    input: pkg.entry,
    output: {
      file: pkg.min,
      name: pkg.name,
      sourcemap: false,
      format: 'umd',
    },

    plugins: [
      resolve({
        preferBuiltins: false
      }),
      commonjs({ include: 'node_modules/**' }), // so Rollup can convert other modules to ES module
      globals(),
      builtins(),
      //uglify()
    ]
  }
  */

];
