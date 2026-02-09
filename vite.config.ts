import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';

import {
  markedImport,
  shikiImport,
  exampleImport,
} from './src/vite-plugins.js';

export default defineConfig({
  assetsInclude: ['**/*.md'],
  plugins: [
    sveltekit(),
    devtoolsJson(),
    Icons({ compiler: 'svelte' }),
    markedImport(),
    shikiImport(),
    exampleImport(),
  ],

  server: {
    watch: {
      ignored: ['**/.direnv/**', '**/node_modules/**'],
    },
  },

  test: {
    expect: { requireAssertions: true },

    projects: [
      {
        extends: './vite.config.ts',

        test: {
          name: 'client',

          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium', headless: true }],
          },

          include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
          exclude: ['src/lib/server/**'],
        },
      },

      {
        extends: './vite.config.ts',

        test: {
          name: 'server',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
        },
      },
    ],
  },
});
