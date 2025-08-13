import type { PoolMetadata } from '$declarations/icp_swap_pool/icp_swap_pool.did';
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
	withdrawICPSwapAfterFailedSwap,
	withdrawUserUnusedBalance
} from '$lib/services/swap.services';
import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
import type { ICPSwapAmountReply } from '$lib/types/api';
import { SwapErrorCodes, SwapProvider } from '$lib/types/swap';
import { mockValidIcToken, mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
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
	withdraw: vi.fn(),
	getUserUnusedBalance: vi.fn(),
	getPoolMetadata: vi.fn()
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
			slippage,
			isSourceTokenIcrc2: true
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
			slippage,
			isSourceTokenIcrc2: true
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
			slippage,
			isSourceTokenIcrc2: true
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
			slippage,
			isSourceTokenIcrc2: true
		});

		expect(result).toHaveLength(2);
		expect(result[0].provider).toBe(SwapProvider.ICP_SWAP);
		expect(result[1].provider).toBe(SwapProvider.KONG_SWAP);
	});

	it('should skip icp swap if token is icrc1', async () => {
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
			slippage,
			isSourceTokenIcrc2: false
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

describe('withdrawICPSwapAfterFailedSwap', () => {
	const identity = mockIdentity;
	const canisterId = 'test-canister-id';
	const tokenId = 'icp';
	const amount = 1000n;
	const fee = 10n;
	const sourceToken = mockValidIcToken as IcTokenToggleable;
	const destinationToken = mockValidIcrcToken as IcTokenToggleable;

	const baseParams = {
		identity,
		canisterId,
		tokenId,
		amount,
		fee,
		sourceToken,
		destinationToken
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should succeed on first withdraw attempt', async () => {
		vi.mocked(icpSwapPool.withdraw).mockResolvedValueOnce(100n);

		const result = await withdrawICPSwapAfterFailedSwap(baseParams);

		expect(icpSwapPool.withdraw).toHaveBeenCalledOnce();
		expect(result.code).toBe(SwapErrorCodes.SWAP_FAILED_WITHDRAW_SUCCESS);
	});

	it('succeeds on second attempt via unused balance (real path)', async () => {
		vi.mocked(icpSwapPool.withdraw).mockRejectedValueOnce(new Error('fail'));

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);

		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 100n,
			balance1: 0n
		});

		vi.mocked(icpSwapPool.withdraw).mockResolvedValueOnce(100n);

		const result = await withdrawICPSwapAfterFailedSwap({
			...baseParams,
			sourceToken,
			destinationToken
		});

		expect(icpSwapPool.withdraw).toHaveBeenCalledTimes(2);
		expect(icpSwapPool.withdraw).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				identity,
				canisterId,
				token: sourceToken.ledgerCanisterId,
				amount: 100n,
				fee: sourceToken.fee
			})
		);
		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(result.code).toBe(SwapErrorCodes.SWAP_FAILED_2ND_WITHDRAW_SUCCESS);
	});

	it('should return failed code if both attempts fail and call setFailedProgressStep (real path)', async () => {
		const setFailedProgressStep = vi.fn();

		vi.mocked(icpSwapPool.withdraw).mockRejectedValueOnce(new Error('fail1'));

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 0n,
			balance1: 0n
		});

		const result = await withdrawICPSwapAfterFailedSwap({
			...baseParams,
			setFailedProgressStep,
			sourceToken,
			destinationToken
		});

		expect(icpSwapPool.withdraw).toHaveBeenCalledOnce();
		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(setFailedProgressStep).toHaveBeenCalledWith(ProgressStepsSwap.WITHDRAW);
		expect(result.code).toBe(SwapErrorCodes.SWAP_FAILED_WITHDRAW_FAILED);
	});
});

describe('performManualWithdraw', () => {
	const identity = mockIdentity;
	const canisterId = 'test-canister-id';
	const sourceToken = mockValidIcToken as IcTokenToggleable;
	const destinationToken = mockValidIcrcToken as IcTokenToggleable;

	const baseParams = {
		withdrawDestinationTokens: true,
		identity,
		canisterId,
		sourceToken,
		destinationToken
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should track success event and return success code', async () => {
		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 1n,
			balance1: 0n
		});
		vi.mocked(icpSwapPool.withdraw).mockResolvedValueOnce(1n);

		const result = await performManualWithdraw(baseParams);

		expect(icpSwapPool.getPoolMetadata).toHaveBeenCalledOnce();
		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(icpSwapPool.withdraw).toHaveBeenCalledOnce();

		expect(trackEvent).toHaveBeenCalledWith({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS,
			metadata: {
				token: destinationToken.symbol,
				tokenDirection: 'receive',
				dApp: SwapProvider.ICP_SWAP
			}
		});
		expect(result.code).toBe(SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS);
		expect(result.message).toBeDefined();
	});

	it('should track failed event, call setFailedProgressStep and return error code', async () => {
		const setFailedProgressStep = vi.fn();

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 0n,
			balance1: 0n
		});

		const result = await performManualWithdraw({
			...baseParams,
			setFailedProgressStep
		});

		expect(icpSwapPool.getPoolMetadata).toHaveBeenCalledOnce();
		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(icpSwapPool.withdraw).not.toHaveBeenCalled();

		expect(trackEvent).toHaveBeenCalledWith({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED,
			metadata: {
				token: destinationToken.symbol,
				tokenDirection: 'receive',
				dApp: SwapProvider.ICP_SWAP
			}
		});
		expect(setFailedProgressStep).toHaveBeenCalledWith(ProgressStepsSwap.WITHDRAW);
		expect(result.code).toBe(SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED);
		expect(result.variant).toBe('error');
	});

	it('should track tokenDirection correctly when withdrawDestinationTokens is false', async () => {
		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 0n,
			balance1: 1n
		});
		vi.mocked(icpSwapPool.withdraw).mockResolvedValueOnce(1n);

		await performManualWithdraw({
			...baseParams,
			withdrawDestinationTokens: false
		});

		expect(trackEvent).toHaveBeenCalledWith({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS,
			metadata: {
				token: sourceToken.symbol,
				tokenDirection: 'pay',
				dApp: SwapProvider.ICP_SWAP
			}
		});
	});
});

describe('withdrawUserUnusedBalance', () => {
	const identity = mockIdentity;
	const canisterId = 'test-canister-id';

	const sourceToken = mockValidIcToken as IcTokenToggleable;

	const destinationToken = mockValidIcrcToken as IcTokenToggleable;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should withdraw both tokens if both balances are non-zero', async () => {
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 1000n,
			balance1: 2000n
		});

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);

		await withdrawUserUnusedBalance({
			identity,
			canisterId,
			sourceToken,
			destinationToken
		});

		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(icpSwapPool.withdraw).toHaveBeenCalledTimes(2);
	});

	it('should reject if both balances are zero', async () => {
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 0n,
			balance1: 0n
		});

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);

		await expect(
			withdrawUserUnusedBalance({
				identity,
				canisterId,
				sourceToken,
				destinationToken
			})
		).rejects.toThrow('No unused balance to withdraw');

		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(icpSwapPool.withdraw).not.toHaveBeenCalled();
	});

	it('should only withdraw destinationToken if only balance0 is non-zero', async () => {
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 1500n,
			balance1: 0n
		});

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);

		await withdrawUserUnusedBalance({
			identity,
			canisterId,
			sourceToken,
			destinationToken
		});

		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(icpSwapPool.withdraw).toHaveBeenCalledWith({
			identity,
			canisterId,
			token: destinationToken.ledgerCanisterId,
			amount: 1500n,
			fee: destinationToken.fee
		});
	});

	it('should only withdraw sourceToken if only balance1 is non-zero', async () => {
		vi.mocked(icpSwapPool.getUserUnusedBalance).mockResolvedValueOnce({
			balance0: 0n,
			balance1: 1500n
		});

		vi.mocked(icpSwapPool.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: sourceToken.ledgerCanisterId, standard: 'icrc' },
			token1: { address: destinationToken.ledgerCanisterId, standard: 'icrc' }
		} as PoolMetadata);

		await withdrawUserUnusedBalance({
			identity,
			canisterId,
			sourceToken,
			destinationToken
		});

		expect(icpSwapPool.getUserUnusedBalance).toHaveBeenCalledOnce();
		expect(icpSwapPool.withdraw).toHaveBeenCalledWith({
			identity,
			canisterId,
			token: sourceToken.ledgerCanisterId,
			amount: 1500n,
			fee: sourceToken.fee
		});
	});
});
