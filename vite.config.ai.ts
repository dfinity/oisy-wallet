import inject from '@rollup/plugin-inject';
import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import { defineViteReplacements, readCanisterIds } from './vite.utils';

process.env.OISY_APP = 'ai';

const network = process.env.DFX_NETWORK ?? 'local';

const config: UserConfig = {
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$declarations: resolve('./src/declarations')
		}
	},
	build: {
		target: 'es2020',
		rollupOptions: {
			plugins: [
				inject({
					modules: { Buffer: ['buffer', 'Buffer'] }
				})
			]
		}
	},
	server: {
		proxy: {
			'/api': 'http://localhost:4943'
		},
		port: 5174
	},
	optimizeDeps: {
		esbuildOptions: {
			define: {
				global: 'globalThis'
			},
			plugins: [
				{
					name: 'fix-node-globals-polyfill',
					setup: (build) => {
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
		define: {
			'process.env': {
				...readCanisterIds({}),
				DFX_NETWORK: network
			},
			...defineViteReplacements()
		}
	};
});
