import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { resolve } from 'path';
import { type UserConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import { defineViteReplacements } from './vite.utils';

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
					find: '$icp',
					replacement: resolve(__dirname, 'src/frontend/src/icp')
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
			silent: true,
			setupFiles: ['./vitest.setup.ts'],
			include: ['./src/**/*.{test,spec}.?(c|m)[jt]s?(x)']
		}
	})
);
