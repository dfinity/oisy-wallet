describe('networks.xrp.env', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	describe('XRP_RPC_HTTP_URL_MAINNET', () => {
		const importUrl = async (): Promise<string | undefined> => {
			vi.resetModules();

			const { XRP_RPC_HTTP_URL_MAINNET } = await import('$env/networks/networks.xrp.env');

			return XRP_RPC_HTTP_URL_MAINNET;
		};

		it('uses a configured endpoint', async () => {
			vi.stubEnv('VITE_XRP_RPC_URL_MAINNET', 'https://rpc.example.com');

			await expect(importUrl()).resolves.toBe('https://rpc.example.com');
		});

		// A declared-but-unset var is the normal case for both of the ways this arrives: a `.env`
		// copied from `.env.example`, and a deployment secret nobody has created yet. `??` would
		// keep the empty string, `xrpHttpRpcUrl` would pass its `assertNonNullish` and hand every
		// request an empty URL, which resolves against the app's own origin instead of failing.
		it('treats an empty value as unconfigured rather than as an endpoint', async () => {
			vi.stubEnv('VITE_XRP_RPC_URL_MAINNET', '');

			await expect(importUrl()).resolves.toBeUndefined();
		});

		// The suite runs with `TEST` true, which is the same branch `ic`/`beta` take: no public
		// fallback, so a spec that forgets to mock an RPC call fails by name instead of reaching
		// the XRP Ledger Foundation cluster for real.
		it('has no endpoint when the var is absent', async () => {
			await expect(importUrl()).resolves.toBeUndefined();
		});
	});
});
