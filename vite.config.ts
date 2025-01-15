import { nonNullish } from '@dfinity/utils';
import inject from '@rollup/plugin-inject';
import { sveltekit } from '@sveltejs/kit/vite';
import { basename, dirname, resolve } from 'node:path';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import { defineViteReplacements, readCanisterIds } from './vite.utils';

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
	css: {
		preprocessorOptions: {
			scss: {
				api: 'modern-compiler'
			}
		}
	},
	build: {
		sourcemap: true,
		target: 'es2020',
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					const folder = dirname(id);

					const libsWalletConnect = ['@walletconnect'];
					const libsQrCode = ['html5-qrcode', 'qr-creator'];

					if (
						[
							'@sveltejs',
							'svelte',
							'@dfinity/gix-components',
							...libsQrCode,
							...libsWalletConnect
						].find((lib) => folder.includes(lib)) === undefined &&
						folder.includes('node_modules')
					) {
						return 'vendor';
					}

					const lazy = ({
						libs,
						chunkName
					}: {
						libs: string[];
						chunkName: string;
					}): string | undefined =>
						libs.find((lib) => folder.includes(lib)) !== undefined &&
						folder.includes('node_modules')
							? chunkName
							: undefined;

					const qrCodeChunk = lazy({ libs: libsQrCode, chunkName: 'qr-code' });
					if (nonNullish(qrCodeChunk)) {
						return qrCodeChunk;
					}

					const walletConnectChunk = lazy({ libs: libsWalletConnect, chunkName: 'walletconnect' });
					if (nonNullish(walletConnectChunk)) {
						return walletConnectChunk;
					}

					return undefined;
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
