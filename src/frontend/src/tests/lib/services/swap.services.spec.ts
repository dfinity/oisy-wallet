import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import * as icpSwapPool from '$lib/api/icp-swap-pool.api';
import * as kongBackendApi from '$lib/api/kong_backend.api';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import * as icpSwapBackend from '$lib/services/icp-swap.services';
import {
	fetchSwapAmounts,
	loadKongSwapTokens,
	performManualWithdraw,
	withdrawICPSwapAfterFailedSwap
} from '$lib/services/swap.services';
import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
import type { ICPSwapAmountReply } from '$lib/types/api';
import type { OptionIdentity } from '$lib/types/identity';
import { SwapErrorCodes, SwapProvider } from '$lib/types/swap';
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

vi.mock('$lib/api/icp-swap-pool.api', () => ({
	withdraw: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
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

	it('should filter out providers with receiveAmount = 0', async () => {
		const kongSwapResponse = { receive_amount: 0n, slippage: 0.5 } as SwapAmountsReply;
		const icpSwapResponse = {
			receiveAmount: 950n,
			slippage: 0.5
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

		expect(result).toHaveLength(1);
		expect(result[0].provider).toBe(SwapProvider.ICP_SWAP);
	});

	it('should sort results by receiveAmount in descending order', async () => {
		const kongSwapResponse = { receive_amount: 800n, slippage: 0.5 } as SwapAmountsReply;
		const icpSwapResponse = { receiveAmount: 950n, slippage: 0.5 } as unknown as ICPSwapAmountReply;

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
		expect(result[0].provider).toBe(SwapProvider.ICP_SWAP);
		expect(result[1].provider).toBe(SwapProvider.KONG_SWAP);
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

describe('withdrawICPSwapAfterFailedSwap', () => {
	const identity = {} as OptionIdentity;
	const canisterId = 'test-canister-id';
	const token = 'icp';
	const amount = 1000n;
	const fee = 10n;

	const baseParams = {
		identity,
		canisterId,
		token,
		amount,
		fee
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should succeed on first withdraw attempt', async () => {
		vi.mocked(icpSwapPool.withdraw).mockResolvedValueOnce(100n);

		const result = await withdrawICPSwapAfterFailedSwap(baseParams);

		expect(icpSwapPool.withdraw).toHaveBeenCalledTimes(1);
		expect(result.code).toBe(SwapErrorCodes.SWAP_FAILED_WITHDRAW_SUCESS);
	});

	it('should succeed on second withdraw attempt after first fails', async () => {
		vi.mocked(icpSwapPool.withdraw).mockRejectedValueOnce(new Error('fail'));

		const result = await withdrawICPSwapAfterFailedSwap(baseParams);

		expect(icpSwapPool.withdraw).toHaveBeenCalledTimes(2);
		expect(result.code).toBe(SwapErrorCodes.SWAP_FAILED_2ND_WITHDRAW_SUCCESS);
	});

	it('should return failed code if both attempts fail and call setFailedProgressStep', async () => {
		const setFailedProgressStep = vi.fn();

		vi.mocked(icpSwapPool.withdraw)
			.mockRejectedValueOnce(new Error('fail1'))
			.mockRejectedValueOnce(new Error('fail2'));

		const result = await withdrawICPSwapAfterFailedSwap({
			...baseParams,
			setFailedProgressStep
		});

		expect(icpSwapPool.withdraw).toHaveBeenCalledTimes(2);
		expect(result.code).toBe(SwapErrorCodes.SWAP_FAILED_WITHDRAW_FAILED);
	});
});

describe('performManualWithdraw', () => {
	const identity = {} as OptionIdentity;
	const canisterId = 'test-canister-id';
	const tokenId = 'icp';
	const amount = 1000n;
	const fee = 10n;

	const token = {
		symbol: 'ICP'
	} as IcTokenToggleable;

	const baseParams = {
		withdrawDestinationTokens: true,
		identity,
		canisterId,
		tokenId,
		amount,
		fee,
		token
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should track success event and return success code', async () => {
		vi.mocked(icpSwapPool.withdraw).mockResolvedValueOnce(100n);

		const result = await performManualWithdraw(baseParams);

		expect(icpSwapPool.withdraw).toHaveBeenCalledTimes(1);
		expect(trackEvent).toHaveBeenCalledWith({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS,
			metadata: {
				token: 'ICP',
				tokenDirection: 'receive'
			}
		});
		expect(result.code).toBe(SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS);
		expect(result.message).toBeDefined();
	});

	it('should track failed event, call setFailedProgressStep and return error code', async () => {
		const setFailedProgressStep = vi.fn();

		vi.mocked(icpSwapPool.withdraw).mockRejectedValueOnce(new Error('fail'));

		const result = await performManualWithdraw({
			...baseParams,
			setFailedProgressStep
		});

		expect(icpSwapPool.withdraw).toHaveBeenCalledTimes(1);
		expect(trackEvent).toHaveBeenCalledWith({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED,
			metadata: {
				token: 'ICP',
				tokenOrigin: 'receive'
			}
		});
		expect(setFailedProgressStep).toHaveBeenCalledWith(ProgressStepsSwap.WITHDRAW);
		expect(result.code).toBe(SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED);
		expect(result.variant).toBe('error');
	});

	it('should track tokenDirection correctly when withdrawDestinationTokens is false', async () => {
		vi.mocked(icpSwapPool.withdraw).mockResolvedValueOnce(1000n);

		await performManualWithdraw({
			...baseParams,
			withdrawDestinationTokens: false
		});

		expect(trackEvent).toHaveBeenCalledWith({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS,
			metadata: {
				token: 'ICP',
				tokenDirection: 'pay'
			}
		});
	});
});
