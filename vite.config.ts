import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import inject from '@rollup/plugin-inject';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { UserConfig } from 'vite';
import { defineConfig, loadEnv } from 'vite';

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const { version } = JSON.parse(json);

// npm run dev = local
// npm run build = local
// dfx deploy = local
// dfx deploy --network ic = ic
// dfx deploy --network staging = staging
const network = process.env.DFX_NETWORK ?? 'local';

const readCanisterIds = ({ prefix }: { prefix?: string }): Record<string, string> => {
	const canisterIdsJsonFile = ['ic', 'staging'].includes(network)
		? join(process.cwd(), 'canister_ids.json')
		: join(process.cwd(), '.dfx', 'local', 'canister_ids.json');

	try {
		type Details = {
			ic?: string;
			staging?: string;
			local?: string;
		};

		const config: Record<string, Details> = JSON.parse(readFileSync(canisterIdsJsonFile, 'utf-8'));

		return Object.entries(config).reduce((acc, current: [string, Details]) => {
			const [canisterName, canisterDetails] = current;

			return {
				...acc,
				[`${prefix ?? ''}${canisterName.toUpperCase()}_CANISTER_ID`]:
					canisterDetails[network as keyof Details]
			};
		}, {});
	} catch (e) {
		console.warn(`Could not get canister ID from ${canisterIdsJsonFile}: ${e}`);
		return {};
	}
};

const config: UserConfig = {
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$declarations: resolve('./src/declarations')
		}
	},
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: `
          @use "./node_modules/@dfinity/gix-components/dist/styles/mixins/media";
          @use "./node_modules/@dfinity/gix-components/dist/styles/mixins/text";
        `
			}
		}
	},
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
			// Polyfill Buffer for production build
			plugins: [
				inject({
					modules: { Buffer: ['buffer', 'Buffer'] }
				})
			]
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
				NodeModulesPolyfillPlugin(),
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
			network === 'ic' ? 'production' : network === 'staging' ? 'staging' : 'development',
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
			VITE_APP_VERSION: JSON.stringify(version),
			VITE_DFX_NETWORK: JSON.stringify(network)
		}
	};
});
