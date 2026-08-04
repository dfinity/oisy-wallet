import inject from '@rollup/plugin-inject';
import { sveltekit } from '@sveltejs/kit/vite';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type PluginOption, type UserConfig } from 'vite';
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

// Dev-only: swaps the caller-specific half of the OISY TRADE API — and the
// deposit service, whose `icrc2_approve` needs real funds — for in-memory mocks,
// so the Trade flows can be clicked through on an unfunded account without
// submitting anything on-chain. Market data still comes from the real canister.
// Opt-in via `VITE_TRADE_MOCK=true`; without it neither mock module is reachable
// from any import, so a normal build cannot pick them up.
const OISY_TRADE_MOCKS: [real: string, mock: string][] = [
	['src/frontend/src/lib/api/oisy-trade.api', 'src/frontend/src/lib/api/oisy-trade.mock.api'],
	[
		'src/frontend/src/lib/services/oisy-trade.deposit.services',
		'src/frontend/src/lib/services/oisy-trade.deposit.mock.services'
	]
];

// Drops the `?v=…` / `?import` suffixes dev requests carry, and the extension,
// so a module has one key however it was reached.
const moduleKey = (id: string): string =>
	resolve(projectRoot, id.split('?')[0]).replace(/\.ts$/, '');

// A resolver rather than a `resolve.alias` entry: the mocks re-export the parts
// of the real modules they don't fake, and they import them under the very
// specifier being redirected. Skipping the redirect when the importer *is* the
// mock lets those imports fall through to the real files, which an alias — which
// only ever sees the specifier — could not do without relative paths. Keyed on
// resolved paths because Vite's own alias plugin has already turned `$lib/…`
// into an absolute path by the time this hook runs.
const oisyTradeMockPlugin = (): PluginOption => ({
	name: 'oisy-trade-mock',
	enforce: 'pre',
	// eslint-disable-next-line local-rules/prefer-object-params -- Rollup calls this hook positionally.
	resolveId: (source: string, importer: string | undefined) => {
		const key = moduleKey(source);

		const entry = OISY_TRADE_MOCKS.find(([real]) => moduleKey(real) === key);

		if (entry === undefined) {
			return null;
		}

		const mock = `${moduleKey(entry[1])}.ts`;

		return importer !== undefined && moduleKey(importer) === moduleKey(mock) ? null : mock;
	}
});

const alias: Record<string, string> = {
	$declarations: resolve('./src/declarations'),
	// Rollup can fail to resolve "exports" subpaths in dynamic import(); pin the entry file.
	'barcode-detector/ponyfill': resolve(
		projectRoot,
		'node_modules/barcode-detector/dist/es/ponyfill.js'
	)
};

const config: UserConfig = {
	plugins: [reactivityDebugPlugin(), sveltekit()],
	resolve: { alias },
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
						['@sveltejs', 'svelte', ...lazy].find((lib) => folder.includes(lib)) === undefined &&
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

	// Read after `loadEnv` so the flag can come either from the shell
	// (`VITE_TRADE_MOCK=true npm run dev`) or from the network's `.env` file.
	const mockOisyTrade = process.env.VITE_TRADE_MOCK === 'true';

	return {
		...config,
		plugins: [...(mockOisyTrade ? [oisyTradeMockPlugin()] : []), ...(config.plugins ?? [])],
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
