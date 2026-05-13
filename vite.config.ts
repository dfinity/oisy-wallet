import inject from '@rollup/plugin-inject';
import { sveltekit } from '@sveltejs/kit/vite';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import { reactivityDebugPlugin } from './vite.plugin.reactivity-debug';
import { defineViteReplacements, readCanisterIds } from './vite.utils';

// npm run dev = local
// npm run build = local
// dfx deploy = local
// dfx deploy --network ic = ic
// dfx deploy --network beta = beta
// dfx deploy --network staging = staging
const network = process.env.DFX_NETWORK ?? 'local';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

const config: UserConfig = {
	plugins: [reactivityDebugPlugin(), sveltekit()],
	resolve: {
		alias: [
			{ find: '$declarations', replacement: resolve('./src/declarations') },
			// Rollup can fail to resolve "exports" subpaths in dynamic import(); pin the entry file.
			{
				find: 'barcode-detector/ponyfill',
				replacement: resolve(projectRoot, 'node_modules/barcode-detector/dist/es/ponyfill.js')
			},
			// Vite 8's bundled postcss-import does not honor the `style` exports
			// condition when resolving `@import 'tailwindcss'` from .scss files,
			// so we explicitly point it at the CSS entry shipped by tailwindcss v4.
			// Use an exact-match regex so JS subpath imports like
			// `tailwindcss/defaultTheme` keep going through normal resolution.
			{
				find: /^tailwindcss$/,
				replacement: resolve(projectRoot, 'node_modules/tailwindcss/index.css')
			}
		]
	},
	build: {
		target: 'es2020',
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					const folder = dirname(id);

					if (folder.includes('src/frontend/src/lib/i18n') && id.endsWith('.json')) {
						return `i18n-${basename(id, '.json')}`;
					}

					const lazy = ['@dfinity/nns', '@dfinity/nns-proto', 'barcode-detector', 'qr-creator'];

					if (
						['@sveltejs', 'svelte', '@dfinity/gix-components', ...lazy].find((lib) =>
							folder.includes(lib)
						) === undefined &&
						folder.includes('node_modules')
					) {
						return 'vendor';
					}

					if (
						lazy.find((lib) => folder.includes(lib)) !== undefined &&
						folder.includes('node_modules')
					) {
						return 'lazy';
					}

					return 'index';
				}
			},
			// Polyfill Buffer for production build
			plugins: [
				inject({
					modules: { Buffer: ['buffer', 'Buffer'] }
				})
			],
			external: (id) => {
				// A list of file to exclude because we parse those manually with custom scripts.
				const filename = basename(id);
				return ['+oisy.page.css'].includes(filename);
			}
		}
	},
	// proxy /api to port 4943 during development
	server: {
		proxy: {
			'/api': 'http://localhost:4943'
		}
	},
	worker: {
		format: 'es'
	}
};

export default defineConfig((): UserConfig => {
	// Expand environment - .env files - with canister IDs
	process.env = {
		...process.env,
		...loadEnv(
			network === 'ic'
				? 'production'
				: ['beta', 'staging'].includes(network)
					? network
					: 'development',
			process.cwd()
		),
		...readCanisterIds({ prefix: 'VITE_' })
	};

	return {
		...config,
		// Backwards compatibility for auto generated types of dfx that are meant for webpack and process.env
		define: {
			'process.env': {
				...readCanisterIds({}),
				DFX_NETWORK: network
			},
			...defineViteReplacements()
		}
	};
});
