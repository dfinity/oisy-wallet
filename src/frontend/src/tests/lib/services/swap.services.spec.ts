import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import * as icpSwapPool from '$lib/api/icp-swap-pool.api';
import * as kongBackendApi from '$lib/api/kong_backend.api';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import * as icpSwapBackend from '$lib/services/icp-swap.services';
import {
	fetchSwapAmounts,
	fetchSwapAmountsEVM,
	loadKongSwapTokens,
	performManualWithdraw,
	withdrawICPSwapAfterFailedSwap
} from '$lib/services/swap.services';
import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
import type { ICPSwapAmountReply } from '$lib/types/api';
import type { OptionIdentity } from '$lib/types/identity';
import {
	SwapErrorCodes,
	SwapProvider,
	type SwapMappedResult,
	type VeloraSwapDetails
} from '$lib/types/swap';
import {
	geSwapEthTokenAddress,
	mapVeloraMarketSwapResult,
	mapVeloraSwapResult
} from '$lib/utils/swap.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { kongIcToken, mockKongBackendTokens } from '$tests/mocks/kong_backend.mock';
import { constructSimpleSDK } from '@velora-dex/sdk';
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

vi.mock('@velora-dex/sdk', () => ({
	constructSimpleSDK: vi.fn()
}));

vi.mock('$lib/utils/swap.utils', async (importOriginal) => {
	const actual = await importOriginal();

	return {
		...(actual as Record<string, unknown>),
		geSwapEthTokenAddress: vi.fn(),

		mapVeloraSwapResult: vi.fn(
			(): SwapMappedResult => ({
				provider: SwapProvider.VELORA,
				receiveAmount: 1n,
				receiveOutMinimum: 2n,
				swapDetails: {} as VeloraSwapDetails,
				type: 'delta'
			})
		),

		mapVeloraMarketSwapResult: vi.fn(
			(): SwapMappedResult => ({
				provider: SwapProvider.VELORA,
				receiveAmount: 1n,
				receiveOutMinimum: 2n,
				swapDetails: {} as VeloraSwapDetails,
				type: 'market'
			})
		)
	};
});

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

describe('fetchSwapAmountsEVM', () => {
	const sourceToken = {
		symbol: 'SRC',
		decimals: 18,
		network: { chainId: '1' },
		address: '0xSrcAddress'
	} as unknown as Erc20Token;

	const destinationToken = {
		symbol: 'DST',
		decimals: 6,
		network: { chainId: '137' },
		address: '0xDestAddress'
	} as unknown as Erc20Token;

	const amount = '1000000000000000000';
	const userAddress = '0xUser';

	const mockGetQuote = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(constructSimpleSDK).mockReturnValue({
			quote: { getQuote: mockGetQuote }
		} as unknown as ReturnType<typeof constructSimpleSDK>);
	});

	afterEach(() => {
		mockGetQuote.mockReset();
	});

	it('returns [] when quote has neither delta nor market', async () => {
		mockGetQuote.mockResolvedValue({});

		const result = await fetchSwapAmountsEVM({
			sourceToken,
			destinationToken,
			amount,
			userAddress
		});

		expect(mapVeloraSwapResult).not.toHaveBeenCalled();
		expect(mapVeloraMarketSwapResult).not.toHaveBeenCalled();
		expect(result).toEqual([]);
	});

	it('calls delta mapper when quote contains delta and returns single-item array', async () => {
		mockGetQuote.mockResolvedValue({ delta: { receiveAmount: '123' } });

		const result = await fetchSwapAmountsEVM({
			sourceToken,
			destinationToken,
			amount,
			userAddress
		});

		expect(geSwapEthTokenAddress).toHaveBeenCalledTimes(2);
		expect(mapVeloraSwapResult).toHaveBeenCalledOnce();
		expect(mapVeloraMarketSwapResult).not.toHaveBeenCalled();
		expect(result).toHaveLength(1);
		expect(result[0].provider).toBe(SwapProvider.VELORA);
	});

	it('calls market mapper when quote contains market and returns single-item array', async () => {
		mockGetQuote.mockResolvedValue({ market: { receiveAmount: '456' } });

		const result = await fetchSwapAmountsEVM({
			sourceToken,
			destinationToken,
			amount,
			userAddress
		});

		expect(mapVeloraMarketSwapResult).toHaveBeenCalledOnce();
		expect(mapVeloraSwapResult).not.toHaveBeenCalled();
		expect(result).toHaveLength(1);
		expect(result[0].provider).toBe(SwapProvider.VELORA);
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
	const tokenId = 'icp';
	const amount = 1000n;
	const fee = 10n;

	const baseParams = {
		identity,
		canisterId,
		tokenId,
		amount,
		fee
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

		expect(icpSwapPool.withdraw).toHaveBeenCalledOnce();
		expect(trackEvent).toHaveBeenCalledWith({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS,
			metadata: {
				token: 'ICP',
				tokenDirection: 'receive',
				dApp: SwapProvider.ICP_SWAP
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

		expect(icpSwapPool.withdraw).toHaveBeenCalledOnce();
		expect(trackEvent).toHaveBeenCalledWith({
			name: SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED,
			metadata: {
				token: 'ICP',
				tokenDirection: 'receive',
				dApp: SwapProvider.ICP_SWAP
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
				tokenDirection: 'pay',
				dApp: SwapProvider.ICP_SWAP
			}
		});
	});
});
