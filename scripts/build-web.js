#!/usr/bin/env node

import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildWeb() {
  console.log('Building web version...');
  
  try {
    // Build the web version
    await build({
      configFile: path.resolve(__dirname, '../vite.config.web.ts'),
      root: path.resolve(__dirname, '..'),
      base: '/new-world-chat-ai/',
      build: {
        outDir: 'docs',
        emptyOutDir: true,
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, '../index-web.tsx')
          }
        }
      }
    });
    
    // Copy the index.html file to docs
    const indexPath = path.resolve(__dirname, '../docs/index.html');
    const sourceIndexPath = path.resolve(__dirname, '../docs/index.html');
    
    if (fs.existsSync(sourceIndexPath)) {
      fs.copyFileSync(sourceIndexPath, indexPath);
      console.log('📄 Copied index.html to docs/');
    }
    
    console.log('✅ Web version built successfully!');
    console.log('📁 Output directory: docs/');
    console.log('🌐 Open docs/index.html in your browser to test');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildWeb(); 