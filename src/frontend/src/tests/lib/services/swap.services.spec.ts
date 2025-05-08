import type { IcToken } from '$icp/types/ic-token';
import * as kongBackendApi from '$lib/api/kong_backend.api';
import * as swapProvidersModule from '$lib/providers/swap.providers';
import { fetchSwapAmounts, loadKongSwapTokens } from '$lib/services/swap.services';
import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
import { SwapProvider, type FetchSwapAmountsParams } from '$lib/types/swap';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { kongIcToken, mockKongBackendTokens } from '$tests/mocks/kong_backend.mock';
import { get } from 'svelte/store';

const kongGetQuoteMock = vi.fn().mockResolvedValue({ fake: 'kong-swap' });
const kongMapQuoteMock = vi
	.fn()
	.mockReturnValue({ provider: SwapProvider.KONG_SWAP, receiveAmount: 1000n });

const icpGetQuoteMock = vi.fn().mockResolvedValue({ fake: 'icp-swap' });
const icpMapQuoteMock = vi
	.fn()
	.mockReturnValue({ provider: SwapProvider.ICP_SWAP, receiveAmount: 900n });

const mockSwapProviders = [
	{
		key: SwapProvider.KONG_SWAP,
		isEnabled: true,
		getQuote: kongGetQuoteMock,
		mapQuoteResult: kongMapQuoteMock
	},
	{
		key: SwapProvider.ICP_SWAP,
		isEnabled: true,
		getQuote: icpGetQuoteMock,
		mapQuoteResult: icpMapQuoteMock
	}
];

vi.spyOn(swapProvidersModule, 'swapProviders', 'get').mockReturnValue(
	mockSwapProviders as unknown as typeof swapProvidersModule.swapProviders
);

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
	const baseParams: FetchSwapAmountsParams = {
		identity: mockIdentity,
		sourceToken: { ledgerCanisterId: 'aaa', standard: 'icrc', decimals: 8 } as IcToken,
		destinationToken: { ledgerCanisterId: 'bbb', standard: 'icrc', decimals: 8 } as IcToken,
		amount: 1,
		tokens: [],
		slippage: 0.5
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockSwapProviders[0].isEnabled = true;
		mockSwapProviders[1].isEnabled = true;
	});

	it('should return results from both providers when both succeed', async () => {
		const result = await fetchSwapAmounts(baseParams);

		expect(result).toHaveLength(2);
		expect(result[0].provider).toBe(SwapProvider.KONG_SWAP);
		expect(result[1].provider).toBe(SwapProvider.ICP_SWAP);
	});

	it('should return only successful results if one provider fails', async () => {
		mockSwapProviders[0].getQuote = vi
			.fn()
			.mockRejectedValueOnce(new Error('Kong provider failed'));

		const result = await fetchSwapAmounts(baseParams);

		expect(result).toHaveLength(1);
		expect(result[0].provider).toBe(SwapProvider.ICP_SWAP);
	});

	it('should return empty array if all providers fail', async () => {
		mockSwapProviders[0].getQuote = vi
			.fn()
			.mockRejectedValueOnce(new Error('Kong provider failed'));
		mockSwapProviders[1].getQuote = vi.fn().mockRejectedValueOnce(new Error('ICP provider failed'));

		const result = await fetchSwapAmounts(baseParams);

		expect(result).toHaveLength(0);
	});

	it('should skip disabled providers', async () => {
		mockSwapProviders[1].isEnabled = false;

		const result = await fetchSwapAmounts(baseParams);

		expect(result).toHaveLength(1);
		expect(result[0].provider).toBe(SwapProvider.KONG_SWAP);
		expect(icpGetQuoteMock).not.toHaveBeenCalled();
	});

	it('should return empty if all providers are disabled', async () => {
		mockSwapProviders[0].isEnabled = false;
		mockSwapProviders[1].isEnabled = false;

		const result = await fetchSwapAmounts(baseParams);

		expect(result).toHaveLength(0);
	});
});
