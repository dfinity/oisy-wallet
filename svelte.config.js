import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const { version } = JSON.parse(json);

const filesPath = (/** @type {string} */ path) => `src/frontend/${path}`;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			fallback: 'index.html',
			precompress: false
		}),
		files: {
			assets: filesPath('static'),
			lib: filesPath('src/lib'),
			routes: filesPath('src/routes'),
			appTemplate: filesPath('src/app.html')
		},
		alias: {
			$declarations: './src/declarations',
			$btc: './src/frontend/src/btc',
			$eth: './src/frontend/src/eth',
			$icp: './src/frontend/src/icp',
			'$icp-eth': './src/frontend/src/icp-eth',
			$env: './src/frontend/src/env'
		},

		serviceWorker: {
			register: false
		},

		version: {
			name: version
		}
	}
};

export default config;
