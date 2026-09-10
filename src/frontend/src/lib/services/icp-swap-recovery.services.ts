import type { PoolData } from '$declarations/icp_swap_factory/icp_swap_factory.did';
import type { Token as ICPSwapToken } from '$declarations/icp_swap_pool/icp_swap_pool.did';
import type { IcToken } from '$icp/types/ic-token';
import { getPoolCanister } from '$lib/api/icp-swap-factory.api';
import { getUserUnusedBalance, withdraw } from '$lib/api/icp-swap-pool.api';
import { ZERO } from '$lib/constants/app.constants';
import { ICP_SWAP_POOL_FEE } from '$lib/constants/swap.constants';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

export interface IcpSwapRecoverableBalance {
	// The token as OISY knows it - symbol, decimals, logo and the ledger fee.
	token: IcToken;
	// The token as the pool knows it. The pool's own standard string is echoed back on withdrawal
	// rather than re-derived, so the call always matches how the pool registered the token.
	poolToken: ICPSwapToken;
	amount: bigint;
}

export interface IcpSwapPoolBalances {
	poolCanisterId: string;
	balances: IcpSwapRecoverableBalance[];
}

// Thrown when the pair has no pool at the fee tier OISY swaps on. The factory rejects an unknown
// pair with a generic canister error, so the cause is kept for the console rather than shown.
export class IcpSwapPoolNotFoundError extends Error {
	constructor(readonly cause?: unknown) {
		super('No ICPSwap pool found for this token pair');
		this.name = 'IcpSwapPoolNotFoundError';
	}
}

const toPoolToken = (token: IcToken): ICPSwapToken => ({
	address: token.ledgerCanisterId,
	standard: token.standard.code
});

// Resolves the pool exactly the way a swap does: the same factory lookup at the same fee tier.
// Since OISY only ever swaps on ICP_SWAP_POOL_FEE, only that tier can hold funds stranded by OISY.
// The factory canonicalises the pair, so the order the two tokens are passed in does not matter.
const findPool = async ({
	identity,
	tokenA,
	tokenB
}: {
	identity: Identity;
	tokenA: IcToken;
	tokenB: IcToken;
}): Promise<PoolData> => {
	try {
		const pool = await getPoolCanister({
			identity,
			token0: toPoolToken(tokenA),
			token1: toPoolToken(tokenB),
			fee: ICP_SWAP_POOL_FEE
		});

		if (isNullish(pool)) {
			throw new IcpSwapPoolNotFoundError();
		}

		return pool;
	} catch (err: unknown) {
		if (err instanceof IcpSwapPoolNotFoundError) {
			throw err;
		}

		throw new IcpSwapPoolNotFoundError(err);
	}
};

// A balance at or below the token's ledger fee cannot be moved: withdrawing it would cost more
// than it is worth. Such rows are dropped rather than shown, so the page never offers a
// withdrawal that is bound to fail.
const isWithdrawable = ({ amount, token: { fee } }: IcpSwapRecoverableBalance): boolean =>
	amount > fee;

/**
 * Collects what the user can recover from one ICPSwap pool: the balance the pool credited to them
 * and never returned, which is what a failed swap or a failed post-swap withdrawal leaves behind.
 *
 * ICPSwap also tracks a "mistransferred" balance, for tokens sent to the pool canister without a
 * matching deposit call. That is not covered, and cannot arise here: it only applies to the direct
 * ICRC-1 deposit flow, and OISY swaps exclusively through the ICRC-2 approval flow. ICPSwap agrees
 * - `getMistransferBalance` answers `InternalError: Use deposit and withdraw instead` for a pool's
 * own trading pair.
 *
 * @throws IcpSwapPoolNotFoundError if the pair has no pool at the supported fee tier.
 */
export const loadIcpSwapRecoverableBalances = async ({
	identity,
	tokenA,
	tokenB
}: {
	identity: Identity;
	tokenA: IcToken;
	tokenB: IcToken;
}): Promise<IcpSwapPoolBalances> => {
	const pool = await findPool({ identity, tokenA, tokenB });

	const canisterId = pool.canisterId.toString();

	const { balance0, balance1 } = await getUserUnusedBalance({
		identity,
		canisterId,
		principal: identity.getPrincipal()
	});

	const unusedByAddress = new Map<string, bigint>([
		[pool.token0.address, balance0],
		[pool.token1.address, balance1]
	]);

	// The pool returns the pair in its own canonical order, so map each leg back onto the token
	// the user picked rather than assuming tokenA is token0.
	const tokenByAddress = new Map<string, IcToken>([
		[tokenA.ledgerCanisterId, tokenA],
		[tokenB.ledgerCanisterId, tokenB]
	]);

	const balances = [pool.token0, pool.token1].reduce<IcpSwapRecoverableBalance[]>(
		(acc, poolToken) => {
			const token = tokenByAddress.get(poolToken.address);

			return nonNullish(token)
				? [...acc, { token, poolToken, amount: unusedByAddress.get(poolToken.address) ?? ZERO }]
				: acc;
		},
		[]
	);

	return { poolCanisterId: canisterId, balances: balances.filter(isWithdrawable) };
};

/**
 * Withdraws one recoverable balance in full.
 *
 * @returns the amount credited back to the user's wallet.
 */
export const withdrawIcpSwapBalance = async ({
	identity,
	poolCanisterId: canisterId,
	balance: { token, amount }
}: {
	identity: Identity;
	poolCanisterId: string;
	balance: IcpSwapRecoverableBalance;
}): Promise<bigint> =>
	await withdraw({
		identity,
		canisterId,
		token: token.ledgerCanisterId,
		amount,
		fee: token.fee
	});
