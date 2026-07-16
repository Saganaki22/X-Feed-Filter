import { build, context } from 'esbuild';
import { mkdir, rm, copyFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'dist');
const outFirefox = path.join(root, 'dist-firefox');
const watch = process.argv.includes('--watch');

const target = 'chrome110';

/** @type {import('esbuild').BuildOptions} */
const shared = {
  bundle: true,
  target,
  format: 'iife',
  platform: 'browser',
  logLevel: 'info',
  sourcemap: false,
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
};

const entries = [
  {
    entryPoints: [path.join(root, 'src/content/index.ts')],
    outfile: path.join(out, 'content/content.js'),
  },
  {
    entryPoints: [path.join(root, 'src/popup/popup.ts')],
    outfile: path.join(out, 'popup/popup.js'),
  },
  {
    entryPoints: [path.join(root, 'src/background/service-worker.ts')],
    outfile: path.join(out, 'background/background.js'),
  },
];

async function copyStatic(output) {
  await mkdir(path.join(output, 'content'), { recursive: true });
  await mkdir(path.join(output, 'popup'), { recursive: true });
  await mkdir(path.join(output, 'background'), { recursive: true });
  await mkdir(path.join(output, 'icons'), { recursive: true });

  await copyFile(path.join(root, 'manifest.json'), path.join(output, 'manifest.json'));
  await copyFile(
    path.join(root, 'src/content/content.css'),
    path.join(output, 'content/content.css'),
  );
  await copyFile(path.join(root, 'src/popup/popup.html'), path.join(output, 'popup/popup.html'));
  await copyFile(path.join(root, 'src/popup/popup.css'), path.join(output, 'popup/popup.css'));

  const iconsSrc = path.join(root, 'public/icons');
  try {
    await cp(iconsSrc, path.join(output, 'icons'), { recursive: true, force: false });
  } catch {
    console.warn('[build] no icons found in public/icons — run "npm run icons"');
  }
}

async function main() {
  await rm(out, { recursive: true, force: true });
  await rm(outFirefox, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  if (watch) {
    await copyStatic(out);
    const ctxs = [];
    for (const e of entries) {
      const ctx = await context({ ...shared, ...e });
      await ctx.watch();
      ctxs.push(ctx);
    }
    console.log('[build] watching…');
  } else {
    for (const e of entries) {
      await build({ ...shared, ...e });
    }
    await copyStatic(out);
    await cp(out, outFirefox, { recursive: true });
    await copyFile(
      path.join(root, 'manifest.firefox.json'),
      path.join(outFirefox, 'manifest.json'),
    );
    console.log('[build] done → dist/ (Chrome/Brave), dist-firefox/ (Firefox)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
