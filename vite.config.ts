import inject from '@rollup/plugin-inject';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { basename, resolve } from 'node:path';
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
	plugins: [sveltekit(), tailwindcss()],
	resolve: {
		alias: {
			$declarations: resolve('./src/declarations')
		}
	},
	...CSS_CONFIG_OPTIONS,
	build: {
		target: 'es2020',
		rollupOptions: {
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
	optimizeDeps: {
		esbuildOptions: {
			define: {
				global: 'globalThis'
			},
			plugins: [
				{
					name: 'fix-node-globals-polyfill',
					setup(build) {
						build.onResolve({ filter: /_virtual-process-polyfill_\.js/ }, ({ path }) => ({ path }));
					}
				}
			]
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
