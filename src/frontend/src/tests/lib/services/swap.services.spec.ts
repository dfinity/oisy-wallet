import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { IcToken } from '$icp/types/ic-token';
import * as kongBackendApi from '$lib/api/kong_backend.api';
import * as icpSwapBackend from '$lib/services/icp-swap.services';
import { fetchSwapAmounts, loadKongSwapTokens } from '$lib/services/swap.services';
import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
import type { ICPSwapAmountReply } from '$lib/types/api';
import { SwapProvider } from '$lib/types/swap';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { kongIcToken, mockKongBackendTokens } from '$tests/mocks/kong_backend.mock';
import { get } from 'svelte/store';

vi.mock(import('$env/icp-swap.env'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		ICP_SWAP_ENABLED: true
	};
});

vi.mock('$lib/api/kong_backend.api', () => ({
	kongSwapAmounts: vi.fn(),
	kongTokens: vi.fn()
}));

vi.mock('$lib/services/icp-swap.services', () => ({
	icpSwapAmounts: vi.fn()
}));

describe('fetchSwapAmounts', () => {
	const mockTokens = [
		{ ledgerCanisterId: 'token0-id', standard: 'icrc', decimals: 18 } as IcToken,
		{ ledgerCanisterId: 'token1-id', standard: 'icrc', decimals: 18 } as IcToken
	];

	const [sourceToken] = mockTokens;
	const [_, destinationToken] = mockTokens;
	const amount = 1000;
	const slippage = 0.5;

	it('should handle both KONG_SWAP and ICP_SWAP providers correctly', async () => {
		const kongSwapResponse = {
			receive_amount: 950n,
			slippage: 0.5
		} as SwapAmountsReply;
		const icpSwapResponse = {
			receiveAmount: 975
		} as unknown as ICPSwapAmountReply;

		vi.mocked(kongBackendApi.kongSwapAmounts).mockResolvedValue(kongSwapResponse);
		vi.mocked(icpSwapBackend.icpSwapAmounts).mockResolvedValue(icpSwapResponse);

		const result = await fetchSwapAmounts({
			identity: mockIdentity,
			sourceToken,
			destinationToken,
			amount,
			tokens: mockTokens,
			slippage
		});

		expect(result).toHaveLength(2);

		const kongSwapResult = result.find((r) => r.provider === SwapProvider.KONG_SWAP);
		const icpSwapResult = result.find((r) => r.provider === SwapProvider.ICP_SWAP);

		expect(kongSwapResult).toBeDefined();
		expect(kongSwapResult?.receiveAmount).toBe(kongSwapResponse.receive_amount);

		expect(icpSwapResult).toBeDefined();
		expect(icpSwapResult?.receiveAmount).toBe(icpSwapResponse.receiveAmount);
	});

	it('should handle provider failures gracefully (e.g., rejected promises)', async () => {
		const kongSwapResponse = { receive_amount: 950n, slippage: 0.5 } as SwapAmountsReply;
		const icpSwapError = new Error('ICP Swap Error');

		vi.mocked(kongBackendApi.kongSwapAmounts).mockResolvedValue(kongSwapResponse);
		vi.mocked(icpSwapBackend.icpSwapAmounts).mockRejectedValue(icpSwapError);

		const result = await fetchSwapAmounts({
			identity: mockIdentity,
			sourceToken,
			destinationToken,
			amount,
			tokens: mockTokens,
			slippage
		});

		expect(result).toHaveLength(1);
		expect(result[0].provider).toBe(SwapProvider.KONG_SWAP);
	});
});

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
