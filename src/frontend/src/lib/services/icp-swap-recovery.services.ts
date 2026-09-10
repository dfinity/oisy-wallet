import type { PoolData } from '$declarations/icp_swap_factory/icp_swap_factory.did';
import type { Token as ICPSwapToken } from '$declarations/icp_swap_pool/icp_swap_pool.did';
import type { IcToken } from '$icp/types/ic-token';
import { getPoolCanister } from '$lib/api/icp-swap-factory.api';
import {
	getMistransferBalance,
	getUserUnusedBalance,
	withdraw,
	withdrawMistransferBalance
} from '$lib/api/icp-swap-pool.api';
import { ZERO } from '$lib/constants/app.constants';
import { ICP_SWAP_POOL_FEE } from '$lib/constants/swap.constants';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

// Which of the two recoverable balances a row represents:
// - `unused`: deposited into the pool and credited to the user, but never swapped or withdrawn.
//   This is what a swap whose withdrawal failed leaves behind.
// - `mistransferred`: transferred straight to the pool canister without a matching deposit call,
//   so the pool never credited it to a position.
export type IcpSwapBalanceKind = 'unused' | 'mistransferred';

export interface IcpSwapRecoverableBalance {
	// The token as OISY knows it - symbol, decimals, logo and the ledger fee.
	token: IcToken;
	// The token as the pool knows it. The pool's own standard string is echoed back on withdrawal
	// rather than re-derived, so the call always matches how the pool registered the token.
	poolToken: ICPSwapToken;
	kind: IcpSwapBalanceKind;
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
// than it is worth, and `withdrawMistransferBalance` deducts the same fee itself. Such rows are
// dropped rather than shown, so the page never offers a withdrawal that is bound to fail.
const isWithdrawable = ({ amount, token: { fee } }: IcpSwapRecoverableBalance): boolean =>
	amount > fee;

/**
 * Collects everything the user can recover from one ICPSwap pool.
 *
 * Both kinds of stranded funds are looked up for both tokens of the pair. The unused balance is
 * required; the mistransfer probe is best-effort, because ICPSwap answers
 * `getMistransferBalance` with `InternalError: Use deposit and withdraw instead` for a pool's own
 * trading pair. `getMistransferBalance` is also an update call - the Candid interface declares no
 * query annotation for it, unlike `getUserUnusedBalance` - so it goes through consensus and
 * dominates the latency here. The cycles are paid by the pool canister, not by OISY or the user.
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

	// The pool returns the pair in its own canonical order, so map each leg back onto the token
	// the user picked rather than assuming tokenA is token0.
	const tokenByAddress = new Map<string, IcToken>([
		[tokenA.ledgerCanisterId, tokenA],
		[tokenB.ledgerCanisterId, tokenB]
	]);

	const legs = [pool.token0, pool.token1].reduce<{ poolToken: ICPSwapToken; token: IcToken }[]>(
		(acc, poolToken) => {
			const token = tokenByAddress.get(poolToken.address);

			return nonNullish(token) ? [...acc, { poolToken, token }] : acc;
		},
		[]
	);

	// The unused balance is the balance that matters and the one that must be readable, so a
	// failure here fails the load.
	const { balance0, balance1 } = await getUserUnusedBalance({
		identity,
		canisterId,
		principal: identity.getPrincipal()
	});

	// The mistransfer probe is best-effort. ICPSwap rejects `getMistransferBalance` with
	// `InternalError: Use deposit and withdraw instead` for a pool's own trading pair - which is
	// the only pair we ever ask about - so in practice this errors for both legs. A rejected probe
	// must therefore not cost the user the unused balance they actually have, which is what
	// awaiting these together used to do.
	const mistransferProbes = await Promise.allSettled(
		legs.map(({ poolToken }) => getMistransferBalance({ identity, canisterId, token: poolToken }))
	);

	const mistransferred = mistransferProbes.map((probe) =>
		probe.status === 'fulfilled' ? probe.value : ZERO
	);

	const unusedByAddress = new Map<string, bigint>([
		[pool.token0.address, balance0],
		[pool.token1.address, balance1]
	]);

	const balances = legs.flatMap(({ poolToken, token }, index) => [
		{
			token,
			poolToken,
			kind: 'unused' as const,
			amount: unusedByAddress.get(poolToken.address) ?? ZERO
		},
		{
			token,
			poolToken,
			kind: 'mistransferred' as const,
			amount: mistransferred[index] ?? ZERO
		}
	]);

	return { poolCanisterId: canisterId, balances: balances.filter(isWithdrawable) };
};

/**
 * Withdraws one recoverable balance in full.
 *
 * `withdraw` needs the amount and the ledger fee; `withdrawMistransferBalance` takes neither - it
 * always moves the whole balance and deducts the fee itself.
 *
 * @returns the amount credited back to the user's wallet.
 */
export const withdrawIcpSwapBalance = async ({
	identity,
	poolCanisterId: canisterId,
	balance: { kind, token, poolToken, amount }
}: {
	identity: Identity;
	poolCanisterId: string;
	balance: IcpSwapRecoverableBalance;
}): Promise<bigint> => {
	if (kind === 'mistransferred') {
		return await withdrawMistransferBalance({ identity, canisterId, token: poolToken });
	}

	return await withdraw({
		identity,
		canisterId,
		token: token.ledgerCanisterId,
		amount,
		fee: token.fee
	});
};
