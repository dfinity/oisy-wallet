import type { IcToken } from '$icp/types/ic-token';
import * as kongBackendApi from '$lib/api/kong_backend.api';
import { swapProviders } from '$lib/providers/swap.providers';
import { fetchSwapAmounts, loadKongSwapTokens } from '$lib/services/swap.services';
import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
import { SwapProvider, type FetchSwapAmountsParams } from '$lib/types/swap';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { kongIcToken, mockKongBackendTokens } from '$tests/mocks/kong_backend.mock';
import { get } from 'svelte/store';

describe('loadKongSwapTokens', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('properly updates kongSwapToken store with the fetched tokens', async () => {
		vi.spyOn(kongBackendApi, 'kongTokens').mockResolvedValue(mockKongBackendTokens);

		await loadKongSwapTokens({ identity: mockIdentity });

		expect(get(kongSwapTokensStore)).toStrictEqual({
			[kongIcToken.symbol]: kongIcToken
		});
	});

	it('properly does not update store if no IC kongTokens available', async () => {
		vi.spyOn(kongBackendApi, 'kongTokens').mockResolvedValue([{ ...mockKongBackendTokens[1] }]);

		await loadKongSwapTokens({ identity: mockIdentity });

		expect(get(kongSwapTokensStore)).toStrictEqual({});
	});
});

describe('fetchSwapAmounts', () => {
	const kongGetQuoteMock = vi.fn().mockResolvedValue({ fake: 'kong' });
	const kongMapQuoteMock = vi.fn().mockReturnValue({
		provider: SwapProvider.KONG_SWAP,
		receiveAmount: 1000n
	});

	const icpGetQuoteMock = vi.fn().mockResolvedValue({ fake: 'icp' });
	const icpMapQuoteMock = vi.fn().mockReturnValue({
		provider: SwapProvider.ICP_SWAP,
		receiveAmount: 900n
	});

	const baseParams: FetchSwapAmountsParams = {
		identity: mockIdentity,
		sourceToken: { decimals: 8 } as IcToken,
		destinationToken: { decimals: 8 } as IcToken,
		amount: 1,
		tokens: [],
		slippage: 0.5
	};

	beforeEach(() => {
		vi.clearAllMocks();

		const kong = swapProviders.find((p) => p.key === SwapProvider.KONG_SWAP)!;
		kong.isEnabled = true;
		kong.getQuote = kongGetQuoteMock;
		kong.mapQuoteResult = kongMapQuoteMock;

		const icp = swapProviders.find((p) => p.key === SwapProvider.ICP_SWAP)!;
		icp.isEnabled = true;
		icp.getQuote = icpGetQuoteMock;
		icp.mapQuoteResult = icpMapQuoteMock;
	});

	it('returns both providers when both succeed', async () => {
		const result = await fetchSwapAmounts(baseParams);

		expect(result).toHaveLength(2);
		expect(result[0].provider).toBe(SwapProvider.KONG_SWAP);
		expect(result[1].provider).toBe(SwapProvider.ICP_SWAP);
	});

	it('returns one if the other fails', async () => {
		kongGetQuoteMock.mockRejectedValueOnce(new Error('fail'));
		const result = await fetchSwapAmounts(baseParams);

		expect(result).toHaveLength(1);
		expect(result[0].provider).toBe(SwapProvider.ICP_SWAP);
	});

	it('returns empty if all fail', async () => {
		kongGetQuoteMock.mockRejectedValueOnce(new Error('fail'));
		icpGetQuoteMock.mockRejectedValueOnce(new Error('fail'));
		const result = await fetchSwapAmounts(baseParams);

		expect(result).toHaveLength(0);
	});

	it('skips disabled providers', async () => {
		const icp = swapProviders.find((p) => p.key === SwapProvider.ICP_SWAP)!;
		icp.isEnabled = false;

		const result = await fetchSwapAmounts(baseParams);

		expect(result).toHaveLength(1);
		expect(result[0].provider).toBe(SwapProvider.KONG_SWAP);
	});

	it('returns empty if all disabled', async () => {
		swapProviders.forEach((p) => (p.isEnabled = false));
		const result = await fetchSwapAmounts(baseParams);

		expect(result).toHaveLength(0);
	});
});
