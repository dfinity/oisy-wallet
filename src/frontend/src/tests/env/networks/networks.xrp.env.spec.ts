import type * as AppConstants from '$lib/constants/app.constants';

describe('networks.xrp.env', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.doUnmock('$lib/constants/app.constants');
		vi.resetModules();
	});

	describe('XRP_RPC_HTTP_URL_MAINNET', () => {
		// `PROD`/`BETA` derive from `VITE_DFX_NETWORK`, a Vite compile-time define rather than an
		// `import.meta.env` read, so `stubEnv` cannot reach them and the build flavour is whatever
		// the suite happens to run as. Mocking the constants states each branch outright instead of
		// asserting against an inherited mode.
		const importUrl = async ({
			test = true,
			prod = false,
			beta = false
		}: { test?: boolean; prod?: boolean; beta?: boolean } = {}): Promise<string | undefined> => {
			vi.doMock('$lib/constants/app.constants', async (importOriginal) => ({
				...(await importOriginal<typeof AppConstants>()),
				TEST: test,
				PROD: prod,
				BETA: beta
			}));

			vi.resetModules();

			const { XRP_RPC_HTTP_URL_MAINNET } = await import('$env/networks/networks.xrp.env');

			return XRP_RPC_HTTP_URL_MAINNET;
		};

		it('uses a configured endpoint', async () => {
			vi.stubEnv('VITE_XRP_RPC_URL_MAINNET', 'https://rpc.example.com');

			await expect(importUrl({ test: false })).resolves.toBe('https://rpc.example.com');
		});

		// `TEST` is checked before the variable, not folded into the fallback: a spec that forgets to
		// mock an RPC call must fail by name rather than reach a real endpoint, and a developer with
		// this variable in their own env would otherwise get a live provider out of that omission.
		it('ignores a configured endpoint under TEST', async () => {
			vi.stubEnv('VITE_XRP_RPC_URL_MAINNET', 'https://rpc.example.com');

			await expect(importUrl()).resolves.toBeUndefined();
		});

		// A declared-but-unset var is the normal case for both of the ways this arrives: a `.env`
		// copied from `.env.example`, and a deployment secret nobody has created yet. `??` would keep
		// the empty string, `xrpHttpRpcUrl` would pass its `assertNonNullish` and hand every request
		// an empty URL, which resolves against the app's own origin instead of failing.
		it('treats an empty value as unconfigured rather than as an endpoint', async () => {
			vi.stubEnv('VITE_XRP_RPC_URL_MAINNET', '');

			await expect(importUrl({ test: false, prod: true })).resolves.toBeUndefined();
		});

		// The public XRP Ledger Foundation cluster is not for sustained use, so user-facing builds
		// get nothing at all and `xrpHttpRpcUrl` throws, rather than silently going public.
		it.each([
			{ flavour: 'ic', flags: { prod: true } },
			{ flavour: 'beta', flags: { beta: true } }
		])('has no endpoint on a $flavour build when the var is absent', async ({ flags }) => {
			await expect(importUrl({ test: false, ...flags })).resolves.toBeUndefined();
		});

		it('falls back to the public cluster on a non-user-facing build', async () => {
			await expect(importUrl({ test: false })).resolves.toBe('https://xrplcluster.com');
		});
	});
});
