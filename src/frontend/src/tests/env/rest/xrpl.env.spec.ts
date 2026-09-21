import type * as AppConstants from '$lib/constants/app.constants';

describe('xrpl.env', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.doUnmock('$lib/constants/app.constants');
		vi.resetModules();
	});

	describe('XRP_RPC_HTTP_URL_MAINNET', () => {
		// `TEST` is a plain constant here, but `PROD`/`BETA` — which this used to branch on — derive
		// from `VITE_DFX_NETWORK`, a Vite compile-time define rather than an `import.meta.env` read,
		// so `stubEnv` could not reach them. Mocking the constants module states the flavour outright
		// instead of asserting against whatever the suite happens to run as.
		const importUrl = async ({ test = true }: { test?: boolean } = {}): Promise<
			string | undefined
		> => {
			vi.doMock('$lib/constants/app.constants', async (importOriginal) => ({
				...(await importOriginal<typeof AppConstants>()),
				TEST: test
			}));

			vi.resetModules();

			const { XRP_RPC_HTTP_URL_MAINNET } = await import('$env/rest/xrpl.env');

			return XRP_RPC_HTTP_URL_MAINNET;
		};

		it('uses a configured endpoint', async () => {
			vi.stubEnv('VITE_XRP_RPC_URL_MAINNET', 'https://rpc.example.com');

			await expect(importUrl({ test: false })).resolves.toBe('https://rpc.example.com');
		});

		// `TEST` is checked before the variable, not folded into it: a spec that forgets to mock an
		// RPC call must fail by name rather than reach a real endpoint, and a developer with this
		// variable in their own env would otherwise get a live provider out of that omission.
		it('ignores a configured endpoint under TEST', async () => {
			vi.stubEnv('VITE_XRP_RPC_URL_MAINNET', 'https://rpc.example.com');

			await expect(importUrl()).resolves.toBeUndefined();
		});

		// A declared-but-unset var is the normal case for both of the ways this arrives: a `.env`
		// copied from `.env.example`, and a deployment secret nobody has created yet. `??` would keep
		// the empty string, `xrpHttpRpcUrl` would pass its own check and hand every request an empty
		// URL, which resolves against the app's own origin instead of failing.
		it('treats an empty value as unconfigured rather than as an endpoint', async () => {
			vi.stubEnv('VITE_XRP_RPC_URL_MAINNET', '');

			await expect(importUrl({ test: false })).resolves.toBeUndefined();
		});

		// No fallback endpoint on any build. A missing variable leaves XRPL unreachable and
		// `xrpHttpRpcUrl` throws, the same way a missing Alchemy or QuickNode key fails its requests
		// — rather than standing in a public cluster that makes an unconfigured build look configured.
		it('has no endpoint at all when the variable is absent', async () => {
			await expect(importUrl({ test: false })).resolves.toBeUndefined();
		});
	});
});
