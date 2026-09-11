import type { PoolData } from '$declarations/icp_swap_factory/icp_swap_factory.did';
import type { Token as ICPSwapToken } from '$declarations/icp_swap_pool/icp_swap_pool.did';
import type { IcToken } from '$icp/types/ic-token';
import { getAllPools, getPoolCanister } from '$lib/api/icp-swap-factory.api';
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
	// The pool's own pair, in its own order, for labelling a group of rows. Kept separately from
	// `balances` because dust filtering can leave a group with a single row while the pair is still
	// what identifies the pool to the user.
	pair: [string, string];
	balances: IcpSwapRecoverableBalance[];
}

export interface IcpSwapScanResult {
	// Pools looked at - i.e. those with both legs among the user's active tokens.
	poolsScanned: number;
	// Only the pools that turned out to hold something withdrawable.
	pools: IcpSwapPoolBalances[];
	// Pools whose balance query failed. Reported rather than swallowed, so a partial scan never
	// passes for an exhaustive one.
	unreadablePools: number;
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

// Maps one pool's two unused balances onto the tokens OISY knows, dropping anything that cannot
// be moved. Shared by the manual lookup and the scan so both produce identical rows.
const toPoolBalances = ({
	pool,
	tokenByAddress,
	balance0,
	balance1
}: {
	pool: PoolData;
	tokenByAddress: Map<string, IcToken>;
	balance0: bigint;
	balance1: bigint;
}): IcpSwapPoolBalances => {
	const unusedByAddress = new Map<string, bigint>([
		[pool.token0.address, balance0],
		[pool.token1.address, balance1]
	]);

	// The pool returns the pair in its own canonical order, so map each leg back onto the token
	// OISY knows rather than assuming an order.
	const balances = [pool.token0, pool.token1].reduce<IcpSwapRecoverableBalance[]>(
		(acc, poolToken) => {
			const token = tokenByAddress.get(poolToken.address);

			return nonNullish(token)
				? [...acc, { token, poolToken, amount: unusedByAddress.get(poolToken.address) ?? ZERO }]
				: acc;
		},
		[]
	);

	return {
		poolCanisterId: pool.canisterId.toString(),
		pair: [
			tokenByAddress.get(pool.token0.address)?.symbol ?? pool.token0.address,
			tokenByAddress.get(pool.token1.address)?.symbol ?? pool.token1.address
		],
		balances: balances.filter(isWithdrawable)
	};
};

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

	const { balance0, balance1 } = await getUserUnusedBalance({
		identity,
		canisterId: pool.canisterId.toString(),
		principal: identity.getPrincipal()
	});

	return toPoolBalances({
		pool,
		tokenByAddress: new Map([
			[tokenA.ledgerCanisterId, tokenA],
			[tokenB.ledgerCanisterId, tokenB]
		]),
		balance0,
		balance1
	});
};

/**
 * Finds every stranded balance across the pools that exist between the user's active tokens.
 *
 * The pool table arrives in a single `getAllPools` query - 860 pools at the time of writing - and
 * is filtered locally, so the cost is one query plus one balance query per pool that actually
 * exists between two active tokens. That is bounded by the pools that exist rather than by the
 * square of the token count: a 17-token wallet reaches 9 pools, not 136 pairs.
 *
 * Balance queries are settled independently. A pool that fails is counted, not thrown, so one bad
 * pool cannot cost the user every other result.
 *
 * Blind to pools with only one active leg - the token swapped *into* may never have been enabled.
 * Those are reachable through the manual pair lookup above; widening the filter is not viable,
 * since roughly half of all pools have ICP as a leg.
 */
export const scanIcpSwapPools = async ({
	identity,
	tokens
}: {
	identity: Identity;
	tokens: IcToken[];
}): Promise<IcpSwapScanResult> => {
	const tokenByAddress = new Map(tokens.map((token) => [token.ledgerCanisterId, token]));

	const allPools = await getAllPools({ identity });

	const candidatePools = allPools.filter(
		({ fee, token0, token1 }) =>
			fee === ICP_SWAP_POOL_FEE &&
			tokenByAddress.has(token0.address) &&
			tokenByAddress.has(token1.address)
	);

	const settled = await Promise.allSettled(
		candidatePools.map(async (pool) => {
			const { balance0, balance1 } = await getUserUnusedBalance({
				identity,
				canisterId: pool.canisterId.toString(),
				principal: identity.getPrincipal()
			});

			return toPoolBalances({ pool, tokenByAddress, balance0, balance1 });
		})
	);

	return {
		poolsScanned: candidatePools.length,
		pools: settled.reduce<IcpSwapPoolBalances[]>(
			(acc, result) =>
				result.status === 'fulfilled' && result.value.balances.length > 0
					? [...acc, result.value]
					: acc,
			[]
		),
		unreadablePools: settled.filter(({ status }) => status === 'rejected').length
	};
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
