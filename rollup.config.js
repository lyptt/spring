import del from 'rollup-plugin-delete'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { terser } from 'rollup-plugin-terser'
import replace from '@rollup/plugin-replace'
import pkg from './package.json'

export default {
  input: 'src/index.ts',
  output: {
    sourcemap: true,
    dir: 'dist',
    format: 'cjs',
  },
  plugins: [
    del({ targets: 'dist/*' }),
    typescript(),
    nodeResolve({
      preferBuiltins: true,
    }),
    commonjs(),
    json(),
    replace({
      'process.env.MODULE_SEARCH_NAME': JSON.stringify(process.env.MODULE_SEARCH_NAME),
      'process.env.GLOBAL_MODULE_NAME': JSON.stringify(process.env.GLOBAL_MODULE_NAME),
      'process.env.GLOBAL_MINI_MODULE_NAME': JSON.stringify(process.env.GLOBAL_MINI_MODULE_NAME),
      'process.env.SPRING_VERSION': JSON.stringify(pkg.version),
      preventAssignment: true,
    }),
    ...(process.env.NODE_ENV === 'production'
      ? [
          terser({
            format: {
              comments: function (_node, comment) {
                var text = comment.value
                var type = comment.type
                if (type == 'comment2') {
                  // multiline comment
                  return /@preserve|@license|@cc_on/i.test(text)
                }
              },
            },
          }),
        ]
      : []),
  ],
  preserveEntrySignatures: 'strict',
  onwarn(warning, warn) {
    // Suppress warnings we can't do anything about
    if (warning.code === 'EVAL' || warning.code === 'CIRCULAR_DEPENDENCY') return
    warn(warning)
  },
}
