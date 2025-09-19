import { sveltekit } from '@sveltejs/kit/vite';
import { basename, dirname, resolve } from 'node:path';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import { CSS_CONFIG_OPTIONS, defineViteReplacements, readCanisterIds } from './vite.utils';

// npm run dev = local
// npm run build = local
// dfx deploy = local
// dfx deploy --network ic = ic
// dfx deploy --network beta = beta
// dfx deploy --network staging = staging
const network = process.env.DFX_NETWORK ?? 'local';

const config: UserConfig = {
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$declarations: resolve('./src/declarations')
		}
	},
	...CSS_CONFIG_OPTIONS,
	build: {
		target: 'es2020',
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					const folder = dirname(id);

					const lazy = ['@dfinity/nns', '@dfinity/nns-proto', 'html5-qrcode', 'qr-creator'];

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
