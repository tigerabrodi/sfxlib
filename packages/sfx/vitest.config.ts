import { playwright } from '@vitest/browser-playwright'
import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, './src') + '/',
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '@/': path.resolve(__dirname, './src') + '/',
          },
        },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
          exclude: [
            'src/**/*.browser.test.ts',
            'tests/**/*.browser.test.ts',
            'node_modules/**',
          ],
        },
      },
      {
        resolve: {
          alias: {
            '@/': path.resolve(__dirname, './src') + '/',
          },
        },
        test: {
          name: 'browser',
          include: [
            'src/**/*.browser.test.ts',
            'tests/**/*.browser.test.ts',
          ],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
