import { XrpNetworks } from '$xrp/types/network';

describe('xrp-rpc.providers', () => {
	afterEach(() => {
		vi.resetModules();
		vi.doUnmock('$env/networks/networks.xrp.env');
	});

	describe('xrpHttpRpcUrl', () => {
		it('returns the configured mainnet RPC endpoint', async () => {
			vi.resetModules();
			vi.doMock('$env/networks/networks.xrp.env', () => ({
				XRP_RPC_HTTP_URL_MAINNET: 'https://rpc.example.com'
			}));

			const { xrpHttpRpcUrl } = await import('$xrp/providers/xrp-rpc.providers');

			expect(xrpHttpRpcUrl(XrpNetworks.mainnet)).toBe('https://rpc.example.com');
		});

		it('throws when no mainnet RPC endpoint is configured', async () => {
			vi.resetModules();
			vi.doMock('$env/networks/networks.xrp.env', () => ({
				XRP_RPC_HTTP_URL_MAINNET: undefined
			}));

			const { xrpHttpRpcUrl } = await import('$xrp/providers/xrp-rpc.providers');

			expect(() => xrpHttpRpcUrl(XrpNetworks.mainnet)).toThrow();
		});
	});
});
