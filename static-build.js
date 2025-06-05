#!/usr/bin/env node

import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 静的サイト用のViteビルド設定
const buildConfig = {
  root: 'client',
  build: {
    outDir: '../dist/static',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'client/index.html'),
      }
    }
  },
  base: './',
  define: {
    // 静的サイト用の環境変数
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'https://your-api-endpoint.vercel.app'),
    'import.meta.env.VITE_STATIC_MODE': JSON.stringify('true')
  }
};

console.log('Building static site...');
await build(buildConfig);
console.log('Static build complete!');