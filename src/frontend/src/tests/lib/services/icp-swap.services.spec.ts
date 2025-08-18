import type { PoolMetadata } from '$declarations/icp_swap_pool/icp_swap_pool.did';
import { approve } from '$icp/api/icrc-ledger.api';
import { sendIcrc } from '$icp/services/ic-send.services';
import { loadCustomTokens } from '$icp/services/icrc.services';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { setCustomToken } from '$lib/api/backend.api';
import * as factoryApi from '$lib/api/icp-swap-factory.api';
import { getPoolCanister } from '$lib/api/icp-swap-factory.api';
import * as poolApi from '$lib/api/icp-swap-pool.api';
import {
	deposit,
	depositFrom,
	getUserUnusedBalance,
	swap as swapIcp,
	withdraw
} from '$lib/api/icp-swap-pool.api';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { icpSwapAmounts } from '$lib/services/icp-swap.services';
import { fetchIcpSwap } from '$lib/services/swap.services';
import { SwapErrorCodes } from '$lib/types/swap';
import * as swapUtils from '$lib/utils/swap.utils';
import { isSwapError } from '$lib/utils/swap.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken, mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@dfinity/principal';

const mockPool = {
	canisterId: Principal.fromText('aaaaa-aa'),
	token0: { address: 'token0', standard: 'icrc' },
	token1: { address: 'token1', standard: 'icrc' },
	fee: 3000n,
	key: 'key',
	tickSpacing: 60n
};

describe('icpSwapAmounts', () => {
	const params = {
		identity: mockIdentity,
		sourceToken: { ledgerCanisterId: 'token0', standard: 'icrc' } as IcToken,
		destinationToken: { ledgerCanisterId: 'token1', standard: 'icrc' } as IcToken,
		sourceAmount: 1000n
	};

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns receiveAmount when everything succeeds', async () => {
		vi.spyOn(factoryApi, 'getPoolCanister').mockResolvedValue(mockPool);
		vi.spyOn(poolApi, 'getQuote').mockResolvedValue(999n);

		const result = await icpSwapAmounts(params);

		expect(result.receiveAmount).toBe(999n);
	});

	it('uses correct zeroForOne = true when source is token0', async () => {
		const getQuoteSpy = vi.spyOn(poolApi, 'getQuote').mockResolvedValue(888n);
		vi.spyOn(factoryApi, 'getPoolCanister').mockResolvedValue(mockPool);

		await icpSwapAmounts(params);

		expect(getQuoteSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			canisterId: 'aaaaa-aa',
			amountIn: '1000',
			zeroForOne: true,
			amountOutMinimum: '0'
		});
	});

	it('uses correct zeroForOne = false when source is token1', async () => {
		const flippedPool = {
			...mockPool,
			token0: { address: 'token1', standard: 'icrc' },
			token1: { address: 'token0', standard: 'icrc' }
		};

		const getQuoteSpy = vi.spyOn(poolApi, 'getQuote').mockResolvedValue(888n);
		vi.spyOn(factoryApi, 'getPoolCanister').mockResolvedValue(flippedPool);

		await icpSwapAmounts(params);

		expect(getQuoteSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			canisterId: 'aaaaa-aa',
			amountIn: '1000',
			zeroForOne: false,
			amountOutMinimum: '0'
		});
	});
});

vi.mock('$lib/api/icp-swap-factory.api');
vi.mock('$lib/api/icp-swap-pool.api');
vi.mock('$icp/api/icrc-ledger.api');
vi.mock('$icp/services/ic-send.services');
vi.mock('$icp/services/icrc.services');
vi.mock('$lib/utils/wallet.utils');
vi.mock('$lib/api/backend.api');

describe('fetchIcpSwap', () => {
	const swapArgs = {
		identity: mockIdentity,
		progress: vi.fn(),
		sourceToken: mockValidIcToken as IcTokenToggleable,
		destinationToken: { ...mockValidIcrcToken, enabled: true } as IcTokenToggleable,
		swapAmount: 8,
		receiveAmount: 900n,
		slippageValue: 0.5,
		sourceTokenFee: 100n,
		isSourceTokenIcrc2: false
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('Success swap for ICRC1', async () => {
		vi.mocked(getPoolCanister).mockResolvedValue(mockPool);

		vi.mocked(sendIcrc).mockResolvedValue(1n);
		vi.mocked(deposit).mockResolvedValue(1n);
		vi.mocked(swapIcp).mockResolvedValue(1n);
		vi.mocked(withdraw).mockResolvedValue(1n);
		vi.mocked(waitAndTriggerWallet).mockResolvedValue();
		vi.mocked(setCustomToken).mockResolvedValue();
		vi.mocked(loadCustomTokens).mockResolvedValue();

		await expect(fetchIcpSwap({ ...swapArgs, isSourceTokenIcrc2: false })).resolves.not.toThrow();

		expect(swapArgs.progress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
		expect(swapArgs.progress).toHaveBeenCalledWith(ProgressStepsSwap.UPDATE_UI);
		expect(sendIcrc).toHaveBeenCalled();
		expect(deposit).toHaveBeenCalled();
		expect(swapIcp).toHaveBeenCalled();
		expect(withdraw).toHaveBeenCalled();
	});

	it('Success swap for ICRC2', async () => {
		vi.mocked(getPoolCanister).mockResolvedValue(mockPool);

		vi.mocked(approve).mockResolvedValue(1n);
		vi.mocked(depositFrom).mockResolvedValue(1n);
		vi.mocked(swapIcp).mockResolvedValue(1n);
		vi.mocked(withdraw).mockResolvedValue(1n);
		vi.mocked(waitAndTriggerWallet).mockResolvedValue();

		await expect(fetchIcpSwap({ ...swapArgs, isSourceTokenIcrc2: true })).resolves.not.toThrow();

		expect(approve).toHaveBeenCalled();
		expect(depositFrom).toHaveBeenCalled();
		expect(swapIcp).toHaveBeenCalled();
		expect(withdraw).toHaveBeenCalled();
	});

	it('Swap failed. Pool not found', async () => {
		vi.mocked(getPoolCanister).mockRejectedValue(new Error('Swap failed. Pool not found.'));

		await expect(fetchIcpSwap({ ...swapArgs })).rejects.toThrow(en.swap.error.pool_not_found);
	});

	it('Swap failed. Deposit failed', async () => {
		vi.mocked(getPoolCanister).mockResolvedValue(mockPool);
		vi.mocked(sendIcrc).mockResolvedValue(1n);
		vi.mocked(deposit).mockRejectedValue(new Error('fail'));

		await expect(fetchIcpSwap({ ...swapArgs })).rejects.toThrow(en.swap.error.deposit_error);
	});

	it('Swap failed. Withdraw Success', async () => {
		vi.mocked(getPoolCanister).mockResolvedValue(mockPool);
		vi.mocked(sendIcrc).mockResolvedValue(1n);
		vi.mocked(deposit).mockResolvedValue(1n);
		vi.mocked(swapIcp).mockRejectedValue(new Error('swap fail'));
		vi.mocked(withdraw).mockResolvedValue(1n);

		await expect(fetchIcpSwap({ ...swapArgs })).rejects.toThrow(
			en.swap.error.swap_failed_withdraw_success
		);
	});

	it('Swap and withdraw both failed', async () => {
		vi.mocked(getPoolCanister).mockResolvedValue(mockPool);
		vi.mocked(sendIcrc).mockResolvedValue(1n);
		vi.mocked(deposit).mockResolvedValue(1n);
		vi.mocked(swapIcp).mockRejectedValue(new Error('swap fail'));
		vi.mocked(withdraw).mockRejectedValue(new Error('withdraw fail'));

		try {
			await fetchIcpSwap({ ...swapArgs });
		} catch (err: unknown) {
			if (isSwapError(err)) {
				expect(err.code).toBe(SwapErrorCodes.SWAP_FAILED_WITHDRAW_FAILED);
			}
		}
	});

	it('Handles tryToWithdraw with withdrawDestinationTokens = false', async () => {
		vi.mocked(getPoolCanister).mockResolvedValue(mockPool);

		vi.mocked(poolApi.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: 'token0', standard: 'icrc' },
			token1: { address: 'token1', standard: 'icrc' }
		} as PoolMetadata);

		vi.mocked(getUserUnusedBalance).mockResolvedValueOnce({ balance0: 1n, balance1: ZERO });

		vi.spyOn(swapUtils, 'getWithdrawableToken').mockReturnValueOnce({
			ledgerCanisterId: 'ledger-0',
			fee: 0n
		} as unknown as IcTokenToggleable);

		vi.mocked(withdraw).mockResolvedValueOnce(1n);

		try {
			await fetchIcpSwap({
				...swapArgs,
				tryToWithdraw: true,
				withdrawDestinationTokens: false
			});
		} catch (err: unknown) {
			if (isSwapError(err)) {
				expect(err.code).toBe(SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS);
			}
		}
	});

	it('Handles tryToWithdraw with withdrawDestinationTokens = true', async () => {
		vi.mocked(getPoolCanister).mockResolvedValue(mockPool);

		vi.mocked(poolApi.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: 'token0', standard: 'icrc' },
			token1: { address: 'token1', standard: 'icrc' }
		} as PoolMetadata);

		vi.mocked(getUserUnusedBalance).mockResolvedValueOnce({ balance0: ZERO, balance1: 1n });

		vi.spyOn(swapUtils, 'getWithdrawableToken').mockReturnValueOnce({
			ledgerCanisterId: 'ledger-1',
			fee: 0n
		} as unknown as IcTokenToggleable);

		vi.mocked(withdraw).mockResolvedValueOnce(1n);

		try {
			await fetchIcpSwap({
				...swapArgs,
				tryToWithdraw: true,
				withdrawDestinationTokens: true
			});
		} catch (err: unknown) {
			if (isSwapError(err)) {
				expect(err.code).toBe(SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS);
			}
		}
	});

	it('Handles tryToWithdraw with assets for sourceToken and destinationToken', async () => {
		vi.mocked(getPoolCanister).mockResolvedValue(mockPool);

		vi.mocked(poolApi.getPoolMetadata).mockResolvedValueOnce({
			token0: { address: 'token0', standard: 'icrc' },
			token1: { address: 'token1', standard: 'icrc' }
		} as PoolMetadata);

		vi.mocked(getUserUnusedBalance).mockResolvedValueOnce({ balance0: 1n, balance1: 1n });

		const tokenFor0: IcTokenToggleable = {
			...mockValidIcToken,
			ledgerCanisterId: 'ledger-0',
			fee: 0n
		} as IcTokenToggleable;

		const tokenFor1: IcTokenToggleable = {
			...mockValidIcrcToken,
			ledgerCanisterId: 'ledger-1',
			fee: 0n
		} as IcTokenToggleable;

		const getWithdrawableTokenSpy = vi
			.spyOn(swapUtils, 'getWithdrawableToken')
			.mockImplementation(({ tokenAddress }) => {
				if (tokenAddress === 'token0') {
					return tokenFor0;
				}
				if (tokenAddress === 'token1') {
					return tokenFor1;
				}
				throw new Error('Unknown token address');
			});

		vi.mocked(withdraw).mockResolvedValueOnce(1n).mockResolvedValueOnce(1n);

		try {
			await fetchIcpSwap({
				...swapArgs,
				tryToWithdraw: true,
				withdrawDestinationTokens: true
			});
		} catch (err: unknown) {
			if (isSwapError(err)) {
				expect(err.code).toBe(SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS);
			}
		}

		expect(getWithdrawableTokenSpy).toHaveBeenCalledTimes(2);
		expect(withdraw).toHaveBeenCalledTimes(2);

		expect(withdraw).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				token: 'ledger-0',
				amount: 1n,
				fee: 0n
			})
		);

		expect(withdraw).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				token: 'ledger-1',
				amount: 1n,
				fee: 0n
			})
		);
	});
});
