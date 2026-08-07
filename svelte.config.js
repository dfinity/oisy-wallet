import { notEmptyString } from '@dfinity/utils';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const packageFile = fileURLToPath(new URL('package.json', import.meta.url));

const { version: packageVersion } = JSON.parse(readFileSync(packageFile, 'utf8'));

const signerVersionsFile = fileURLToPath(new URL('signer-versions.json', import.meta.url));

const signerVersions = JSON.parse(readFileSync(signerVersionsFile, 'utf8'));

const signerTarget = process.env.OISY_SIGNER_TARGET;

const version =
	(signerTarget === 'legacy_signer' ? signerVersions['legacy_signer_frontend'] : undefined) ??
	packageVersion;

const filesPath = (/** @type {string} */ path) => `src/frontend/${path}`;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			fallback: 'index.html',
			precompress: false
		}),
		prerender: {
			...(notEmptyString(signerTarget) && { handleUnseenRoutes: 'ignore' })
		},
		files: {
			assets: filesPath('static'),
			hooks: {
				universal: filesPath('src/hooks')
			},
			lib: filesPath('src/lib'),
			routes: filesPath('src/routes'),
			appTemplate: filesPath('src/app.html')
		},
		alias: {
			$declarations: './src/declarations',
			$btc: './src/frontend/src/btc',
			$eth: './src/frontend/src/eth',
			$evm: './src/frontend/src/evm',
			$icp: './src/frontend/src/icp',
			$sol: './src/frontend/src/sol',
			$xrp: './src/frontend/src/xrp',
			'$icp-eth': './src/frontend/src/icp-eth',
			$env: './src/frontend/src/env',
			$routes: './src/frontend/src/routes'
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
