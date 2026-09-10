import { getPoolCanister } from '$lib/api/icp-swap-factory.api';
import { getUserUnusedBalance, withdraw } from '$lib/api/icp-swap-pool.api';
import { ZERO } from '$lib/constants/app.constants';
import { ICP_SWAP_POOL_FEE } from '$lib/constants/swap.constants';
import {
	IcpSwapPoolNotFoundError,
	loadIcpSwapRecoverableBalances,
	withdrawIcpSwapBalance,
	type IcpSwapRecoverableBalance
} from '$lib/services/icp-swap-recovery.services';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';

vi.mock('$lib/api/icp-swap-factory.api', () => ({
	getPoolCanister: vi.fn()
}));

vi.mock('$lib/api/icp-swap-pool.api', () => ({
	getUserUnusedBalance: vi.fn(),
	withdraw: vi.fn()
}));

const tokenA = {
	...mockValidIcrcToken,
	symbol: 'ICP',
	ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
	fee: 10_000n
};

const tokenB = {
	...mockValidIcrcToken,
	symbol: 'ckUSDC',
	ledgerCanisterId: 'qaa6y-5yaaa-aaaaa-aaafa-cai',
	fee: 4_000n
};

const poolCanisterId = 'aaaaa-aa';

// The factory returns the pair in its own canonical order, which here is B first - so the tests
// also cover that the service maps each leg back onto the token the user picked.
const pool = {
	canisterId: Principal.fromText(poolCanisterId),
	fee: ICP_SWAP_POOL_FEE,
	key: 'pool-key',
	tickSpacing: 60n,
	token0: { address: tokenB.ledgerCanisterId, standard: 'ICRC2' },
	token1: { address: tokenA.ledgerCanisterId, standard: 'ICRC1' }
};

const loadParams = { identity: mockIdentity, tokenA, tokenB };

describe('icp-swap-recovery.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(getPoolCanister).mockResolvedValue(pool);
		vi.mocked(getUserUnusedBalance).mockResolvedValue({ balance0: ZERO, balance1: ZERO });
	});

	describe('loadIcpSwapRecoverableBalances', () => {
		it('resolves the pool at the fee tier OISY swaps on', async () => {
			await loadIcpSwapRecoverableBalances(loadParams);

			expect(getPoolCanister).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				token0: { address: tokenA.ledgerCanisterId, standard: tokenA.standard.code },
				token1: { address: tokenB.ledgerCanisterId, standard: tokenB.standard.code },
				fee: ICP_SWAP_POOL_FEE
			});
		});

		it('throws IcpSwapPoolNotFoundError when the factory rejects the pair', async () => {
			vi.mocked(getPoolCanister).mockRejectedValue(new Error('Common error: pool not found'));

			await expect(loadIcpSwapRecoverableBalances(loadParams)).rejects.toThrow(
				IcpSwapPoolNotFoundError
			);
		});

		it('throws IcpSwapPoolNotFoundError when the factory returns nothing', async () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			vi.mocked(getPoolCanister).mockResolvedValue(undefined as any);

			await expect(loadIcpSwapRecoverableBalances(loadParams)).rejects.toThrow(
				IcpSwapPoolNotFoundError
			);
		});

		it('returns no balances when the pool holds nothing for the user', async () => {
			const { poolCanisterId: canisterId, balances } =
				await loadIcpSwapRecoverableBalances(loadParams);

			expect(canisterId).toBe(poolCanisterId);
			expect(balances).toStrictEqual([]);
		});

		it('hides balances at or below the token ledger fee', async () => {
			// tokenB (token0) is exactly at its fee, tokenA (token1) one unit below its own.
			vi.mocked(getUserUnusedBalance).mockResolvedValue({
				balance0: tokenB.fee,
				balance1: tokenA.fee - 1n
			});

			const { balances } = await loadIcpSwapRecoverableBalances(loadParams);

			expect(balances).toStrictEqual([]);
		});

		it('keeps a balance one unit above the ledger fee', async () => {
			vi.mocked(getUserUnusedBalance).mockResolvedValue({
				balance0: ZERO,
				balance1: tokenA.fee + 1n
			});

			const { balances } = await loadIcpSwapRecoverableBalances(loadParams);

			expect(balances).toStrictEqual([
				{ token: tokenA, poolToken: pool.token1, amount: tokenA.fee + 1n }
			]);
		});

		it('maps each leg onto the token the user picked', async () => {
			vi.mocked(getUserUnusedBalance).mockResolvedValue({
				balance0: 500_000n,
				balance1: 900_000n
			});

			const { balances } = await loadIcpSwapRecoverableBalances(loadParams);

			// token0 is tokenB and token1 is tokenA - the factory's own order, not the user's.
			expect(balances).toStrictEqual([
				{ token: tokenB, poolToken: pool.token0, amount: 500_000n },
				{ token: tokenA, poolToken: pool.token1, amount: 900_000n }
			]);
		});

		it('fails the load when the unused balance itself cannot be read', async () => {
			vi.mocked(getUserUnusedBalance).mockRejectedValue(new Error('pool unavailable'));

			await expect(loadIcpSwapRecoverableBalances(loadParams)).rejects.toThrow('pool unavailable');
		});
	});

	describe('withdrawIcpSwapBalance', () => {
		const unused: IcpSwapRecoverableBalance = {
			token: tokenA,
			poolToken: pool.token1,
			amount: 900_000n
		};

		it('withdraws the balance in full, with the token ledger fee', async () => {
			vi.mocked(withdraw).mockResolvedValue(900_000n);

			const result = await withdrawIcpSwapBalance({
				identity: mockIdentity,
				poolCanisterId,
				balance: unused
			});

			expect(result).toBe(900_000n);
			expect(withdraw).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: poolCanisterId,
				token: tokenA.ledgerCanisterId,
				amount: 900_000n,
				fee: tokenA.fee
			});
		});

		it('propagates a failing withdrawal', async () => {
			vi.mocked(withdraw).mockRejectedValue(new Error('Internal error: pool unavailable'));

			await expect(
				withdrawIcpSwapBalance({ identity: mockIdentity, poolCanisterId, balance: unused })
			).rejects.toThrow('Internal error: pool unavailable');
		});
	});
});
