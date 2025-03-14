import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { resolve } from 'path';
import { type UserConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import { CSS_CONFIG_OPTIONS, defineViteReplacements, readCanisterIds } from './vite.utils';

process.env = {
	...process.env,
	...readCanisterIds({ prefix: 'VITE_' })
};

export default defineConfig(
	(): UserConfig => ({
		plugins: [sveltekit(), svelteTesting()],
		...CSS_CONFIG_OPTIONS,
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
					find: /^uint8arrays$/,
					replacement: 'uint8arrays/cjs/src/index.js'
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
			include: ['./src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
			coverage: {
				exclude: ['build', '.dfx', '**/.svelte-kit']
			}
		}
	})
);
