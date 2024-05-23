import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'path';
import type { UserConfig } from 'vite';
import { defineConfig } from 'vitest/config';

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const { version } = JSON.parse(json);

const network = process.env.DFX_NETWORK ?? 'local';

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
			VITE_APP_VERSION: JSON.stringify(version),
			VITE_DFX_NETWORK: JSON.stringify(network)
		},
		test: {
			environment: 'jsdom',
			globals: true,
			watch: false,
			silent: true,
			setupFiles: ['./vitest.setup.ts']
		}
	})
);
