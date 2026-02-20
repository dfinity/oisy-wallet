import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { resolve } from 'path';
import type { UserConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import { defineViteReplacements, readCanisterIds } from './vite.utils';

process.env = {
	...process.env,
	...readCanisterIds({ prefix: 'VITE_' })
};

export default defineConfig(
	(): UserConfig => ({
		plugins: [sveltekit(), svelteTesting()],
		resolve: {
			alias: [
				{
					find: '$lib',
					replacement: resolve(__dirname, 'src/frontend/src/lib')
				},
				{
					find: '$routes',
					replacement: resolve(__dirname, 'src/frontend/src/routes')
				},
				{
					find: '$btc',
					replacement: resolve(__dirname, 'src/frontend/src/btc')
				},
				{
					find: '$eth',
					replacement: resolve(__dirname, 'src/frontend/src/eth')
				},
				{
					find: '$evm',
					replacement: resolve(__dirname, 'src/frontend/src/evm')
				},
				{
					find: '$icp',
					replacement: resolve(__dirname, 'src/frontend/src/icp')
				},
				{
					find: '$sol',
					replacement: resolve(__dirname, 'src/frontend/src/sol')
				},
				{
					find: '$icp-eth',
					replacement: resolve(__dirname, 'src/frontend/src/icp-eth')
				},
				{
					find: '$tests',
					replacement: resolve(__dirname, 'src/frontend/src/tests')
				},
				{
					find: '$env',
					replacement: resolve(__dirname, 'src/frontend/src/env')
				},
				{
					find: '$declarations',
					replacement: resolve(__dirname, 'src/declarations')
				},
				{
					find: '@plausible-analytics/tracker',
					replacement: resolve(__dirname, 'src/frontend/src/tests/mocks/plausible-tracker.mock')
				}
			]
		},
		define: {
			...defineViteReplacements()
		},
		test: {
			environment: 'jsdom',
			globals: true,
			watch: false,
			silent: false,
			setupFiles: ['./vitest.setup.ts'],
			include: ['src/frontend/src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
			coverage: {
				include: ['src/frontend/src/**/*.{ts,svelte}'],
				exclude: [
					'src/frontend/src/routes/**/+page.ts',
					'src/frontend/src/tests/**/*',
					'src/frontend/src/**/*.d.ts'
				],
				// TODO: increase the thresholds slowly up to an acceptable 90% at least
				thresholds: {
					autoUpdate: true,
					statements: 68,
					branches: 52,
					functions: 69,
					lines: 76.8
				}
			}
		}
	})
);
