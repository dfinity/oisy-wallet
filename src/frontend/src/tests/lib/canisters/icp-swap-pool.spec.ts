import type {
	DepositArgs,
	Result,
	SwapArgs,
	_SERVICE as SwapPoolService,
	WithdrawArgs
} from '$declarations/icp_swap_pool/icp_swap_pool.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { ICPSwapPoolCanister } from '$lib/canisters/icp-swap-pool.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { mock } from 'vitest-mock-extended';

const args: SwapArgs = {
	amountIn: '1000000000',
	zeroForOne: true,
	amountOutMinimum: '900000000'
};

const depositArgs: DepositArgs = {
	amount: 1000000000n,
	fee: 10000n,
	token: 'aaaaa-aa'
};

const withdrawArgs: WithdrawArgs = {
	amount: 500000000n,
	fee: 10000n,
	token: 'aaaaa-aa'
};

const principal = Principal.fromText('aaaaa-aa');
const amount = 1000000000n;
const okResult: Result = { ok: amount };
const errResult: Result = { err: { InternalError: 'Internal failure' } };
const mockResponseError = new Error('Pool error');

describe('icp_swap_pool.canister', () => {
	const createPool = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<SwapPoolService>, 'serviceOverride'>) =>
		ICPSwapPoolCanister.create({
			canisterId: principal,
			identity: mockIdentity,
			serviceOverride,
			certifiedServiceOverride: serviceOverride
		});

	const service = mock<ActorSubclass<SwapPoolService>>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('quote', () => {
		it('returns quote result successfully', async () => {
			service.quote.mockResolvedValue(okResult);
			const { quote } = await createPool({ serviceOverride: service });
			const result = await quote(args);

			expect(result).toEqual(amount);
		});

		it('throws CanisterInternalError on error variant', async () => {
			service.quote.mockResolvedValue(errResult);
			const { quote } = await createPool({ serviceOverride: service });

			await expect(quote(args)).rejects.toThrow(
				new CanisterInternalError('Internal error: Internal failure')
			);
		});

		it('throws raw error if quote throws', async () => {
			service.quote.mockImplementation(() => {
				throw mockResponseError;
			});
			const { quote } = await createPool({ serviceOverride: service });
			const result = quote(args);

			await expect(result).rejects.toThrow(mockResponseError);
		});
	});

	describe('swap', () => {
		it('returns swap result successfully', async () => {
			service.swap.mockResolvedValue(okResult);
			const { swap } = await createPool({ serviceOverride: service });
			const result = await swap(args);

			expect(result).toEqual(amount);
		});

		it('throws CanisterInternalError on error variant', async () => {
			service.swap.mockResolvedValue(errResult);
			const { swap } = await createPool({ serviceOverride: service });
			const result = swap(args);

			await expect(result).rejects.toThrow(
				new CanisterInternalError('Internal error: Internal failure')
			);
		});

		it('throws raw error if swap throws', async () => {
			service.swap.mockImplementation(() => {
				throw mockResponseError;
			});
			const { swap } = await createPool({ serviceOverride: service });
			const result = swap(args);

			await expect(result).rejects.toThrow(mockResponseError);
		});
	});

	describe('deposit', () => {
		it('returns deposit result successfully', async () => {
			service.deposit.mockResolvedValue(okResult);
			const { deposit } = await createPool({ serviceOverride: service });
			const result = await deposit(depositArgs);

			expect(result).toEqual(amount);
		});

		it('throws CanisterInternalError on error variant', async () => {
			service.deposit.mockResolvedValue(errResult);
			const { deposit } = await createPool({ serviceOverride: service });
			const result = deposit(depositArgs);

			await expect(result).rejects.toThrow(
				new CanisterInternalError('Internal error: Internal failure')
			);
		});

		it('throws raw error if deposit throws', async () => {
			service.deposit.mockImplementation(() => {
				throw mockResponseError;
			});
			const { deposit } = await createPool({ serviceOverride: service });
			const result = deposit(depositArgs);

			await expect(result).rejects.toThrow(mockResponseError);
		});
	});

	describe('depositFrom', () => {
		it('returns depositFrom result successfully', async () => {
			service.depositFrom.mockResolvedValue(okResult);
			const { depositFrom } = await createPool({ serviceOverride: service });
			const result = await depositFrom(depositArgs);

			expect(result).toEqual(amount);
		});

		it('throws CanisterInternalError on error variant', async () => {
			service.depositFrom.mockResolvedValue(errResult);
			const { depositFrom } = await createPool({ serviceOverride: service });
			const result = depositFrom(depositArgs);

			await expect(result).rejects.toThrow(
				new CanisterInternalError('Internal error: Internal failure')
			);
		});

		it('throws raw error if depositFrom throws', async () => {
			service.depositFrom.mockImplementation(() => {
				throw mockResponseError;
			});
			const { depositFrom } = await createPool({ serviceOverride: service });
			const result = depositFrom(depositArgs);

			await expect(result).rejects.toThrow(mockResponseError);
		});
	});

	describe('withdraw', () => {
		it('returns withdraw result successfully', async () => {
			service.withdraw.mockResolvedValue(okResult);
			const { withdraw } = await createPool({ serviceOverride: service });
			const result = await withdraw(withdrawArgs);

			expect(result).toEqual(amount);
		});

		it('throws CanisterInternalError on error variant', async () => {
			service.withdraw.mockResolvedValue(errResult);
			const { withdraw } = await createPool({ serviceOverride: service });
			const result = withdraw(withdrawArgs);

			await expect(result).rejects.toThrow(
				new CanisterInternalError('Internal error: Internal failure')
			);
		});

		it('throws raw error if withdraw throws', async () => {
			service.withdraw.mockImplementation(() => {
				throw mockResponseError;
			});
			const { withdraw } = await createPool({ serviceOverride: service });
			const result = withdraw(withdrawArgs);

			await expect(result).rejects.toThrow(mockResponseError);
		});
	});

	describe('getUserUnusedBalance', () => {
		it('returns user unused balance successfully', async () => {
			const unused = { balance0: 10n, balance1: 5n };
			service.getUserUnusedBalance.mockResolvedValue({ ok: unused });
			const { getUserUnusedBalance } = await createPool({ serviceOverride: service });
			const result = await getUserUnusedBalance(principal);

			expect(result).toEqual(unused);
		});

		it('throws CanisterInternalError on error variant', async () => {
			service.getUserUnusedBalance.mockResolvedValue({
				err: { InternalError: 'Failed to get balance' }
			});
			const { getUserUnusedBalance } = await createPool({ serviceOverride: service });
			const result = getUserUnusedBalance(principal);

			await expect(result).rejects.toThrow(
				new CanisterInternalError('Internal error: Failed to get balance')
			);
		});

		it('throws raw error if getUserUnusedBalance throws', async () => {
			service.getUserUnusedBalance.mockImplementation(() => {
				throw mockResponseError;
			});
			const { getUserUnusedBalance } = await createPool({ serviceOverride: service });
			const result = getUserUnusedBalance(principal);

			await expect(result).rejects.toThrow(mockResponseError);
		});
	});

	describe('getPoolMetadata', () => {
		it('returns pool metadata successfully', async () => {
			const mockPoolMetadata = {
				fee: BigInt(3000),
				key: 'pool-icp-wtn',
				sqrtPriceX96: BigInt('3950336'),
				tick: BigInt(12345),
				liquidity: BigInt(500000000000n),
				token0: {
					address: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
					standard: 'icrc1'
				},
				token1: {
					address: 'qaa6y-5yaaa-aaaaa-aaafa-cai',
					standard: 'icrc2'
				},
				maxLiquidityPerTick: BigInt('913129639935'),
				nextPositionId: BigInt(42)
			};
			service.metadata.mockResolvedValue({ ok: mockPoolMetadata });
			const { getPoolMetadata } = await createPool({ serviceOverride: service });
			const result = await getPoolMetadata();

			expect(result).toEqual(mockPoolMetadata);
		});

		it('throws CanisterInternalError on error variant', async () => {
			service.metadata.mockResolvedValue({
				err: { InternalError: 'Failed to get pool metadata' }
			});
			const { getPoolMetadata } = await createPool({ serviceOverride: service });
			const result = getPoolMetadata();

			await expect(result).rejects.toThrow(
				new CanisterInternalError('Internal error: Failed to get pool metadata')
			);
		});

		it('throws raw error if getPoolMetadata throws', async () => {
			service.metadata.mockImplementation(() => {
				throw mockResponseError;
			});
			const { getPoolMetadata } = await createPool({ serviceOverride: service });
			const result = getPoolMetadata();

			await expect(result).rejects.toThrow(mockResponseError);
		});
	});
});
