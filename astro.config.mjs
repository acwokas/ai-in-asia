import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    sitemap(),
  ],
  site: import.meta.env.SITE_URL || 'https://aiinasia.com',
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'react-dom/server': 'react-dom/server.edge',
        'react-dom/server.browser': 'react-dom/server.edge',
      },
    },
    build: {
      emptyOutDir: false,
    },
    ssr: {
      noExternal: [
        'react',
        'react-dom',
        'date-fns',
        '@tiptap/core',
        '@tiptap/starter-kit',
        '@tiptap/extension-link',
        '@tiptap/extension-table',
        '@tiptap/extension-table-row',
        '@tiptap/extension-table-header',
        '@tiptap/extension-table-cell',
        '@tiptap/extension-text-align',
        '@tiptap/extension-underline',
        '@tiptap/pm',
      ],
    },
  },
});
