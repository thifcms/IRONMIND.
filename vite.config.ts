import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig(() => {
  return {
    // Base path dos assets. Render/Netlify servem na raiz do domínio
    // ('/'), mas o GitHub Pages publica dentro de uma subpasta
    // (github.io/NOME-DO-REPO/) -- sem isso, os arquivos JS/CSS são
    // procurados no lugar errado e a página fica em branco.
    base: process.env.VITE_BASE_PATH || '/',
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
