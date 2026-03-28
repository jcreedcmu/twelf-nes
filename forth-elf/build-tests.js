import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['./src/run-tests.ts'],
  bundle: true,
  platform: 'node',
  outfile: './test-bundle.js',
  format: 'esm',
  logLevel: 'error',
});
