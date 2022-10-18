import deno from 'rollup-plugin-node-deno'
import MagicString from 'magic-string'
import { defineNitroPreset } from '../preset'

export const denoServer = defineNitroPreset({
  extends: 'node-server',
  entry: '#internal/nitro/entries/deno-server',
  commands: {
    preview: 'deno run --unstable --allow-net --allow-read --allow-env ./server/index.mjs'
  },
  rollupConfig: {
    output: {
      hoistTransitiveImports: false
    },
    plugins: [
      deno(),
      {
        name: 'inject-process',
        renderChunk (code, chunk) {
          if (!chunk.isEntry || code.includes('ROLLUP_NO_REPLACE') || !code.includes('process')) {
            return
          }

          const s = new MagicString(code)
          s.prepend("import process from 'https://deno.land/std/node/process.ts'\n")

          return {
            code: s.toString(),
            map: s.generateMap({ includeContent: true })
          }
        }
      }
    ]
  }
})
