import type { ActiveUserTransaction, TokenId } from '$declarations/backend/backend.did';
import {
	isReloadableEthereumBalanceToken,
	reloadEthereumBalance
} from '$eth/services/eth-balance.services';
import { RIFT_MAX_ORDER_READS_PER_TICK } from '$lib/constants/swap.constants';
import { getRiftOrder, isRiftRateLimited } from '$lib/rest/rift.rest';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import { RiftApiError } from '$lib/types/errors';
import { RIFT_EXTERNAL_REF_KEYS, type RiftExternalRefKey } from '$lib/types/rift';
import type { Token } from '$lib/types/token';
import { advanceStatus } from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import {
	toRiftExternalRefs,
	toRiftExternalRefsMap,
	toRiftLearnedRefs,
	toRiftStatusUpdate
} from '$lib/utils/rift-active-tx.utils';
import { findTokenByBackendTokenId } from '$lib/utils/token-id.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

// When each row's order was last read, by row id, so that a round starts with the rows read least
// recently. In memory, like the pollers' other counters: a refresh only reorders the next rounds.
const lastReadAt = new Map<string, number>();

export const resetRiftPollState = () => {
	lastReadAt.clear();
};

const pollRiftActiveUserTransaction = async ({
	tx,
	identity
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
}): Promise<void> => {
	const refs = toRiftExternalRefsMap(tx.external_refs);
	const orderId = refs[RIFT_EXTERNAL_REF_KEYS.ORDER_ID];

	// Not pollable without its order, which the backend requires at creation.
	if (isNullish(orderId)) {
		return;
	}

	const order = await getRiftOrder({ orderId });

	// Rift's answers are unsigned: one about another order says nothing about this row.
	if (order.id.toLowerCase() !== orderId.toLowerCase()) {
		consoleError(`Rift answered for order ${order.id} when asked for ${orderId}`);
		return;
	}

	const statusUpdate = toRiftStatusUpdate(order.status);

	const next = nonNullish(statusUpdate)
		? advanceStatus({ current: tx.status, candidate: statusUpdate.status })
		: undefined;

	// Written with the status, in the same update: a terminal row is never written again.
	const learned = toRiftLearnedRefs({ order, refs });
	const hasNewRefs = (Object.keys(learned) as RiftExternalRefKey[]).some(
		(key) => refs[key] !== learned[key]
	);

	const error = nonNullish(next) && 'Failed' in next ? statusUpdate?.error : undefined;

	await applyActiveUserTransactionPollUpdate({
		identity,
		tx,
		update: {
			...(nonNullish(next) && { status: next }),
			...(nonNullish(error) && { error }),
			...(hasNewRefs && { externalRefs: toRiftExternalRefs({ ...refs, ...learned }) })
		}
	});
};

/**
 * Advances the pending Rift rows from `GET /order/{id}`, one read after another through the client's
 * limiter, whatever `RIFT_SWAP_ENABLED` says: a row can outlive the flag.
 *
 * A round reads at most `RIFT_MAX_ORDER_READS_PER_TICK` rows, least recently read first, since the
 * other providers' pollers share the tick. A 429 ends the round, and the row that got it counts as
 * read, so the next round starts with the rows this one did not reach. While Rift holds requests
 * back after a 429, a round reads nothing. Any other failure, a 404 or an unreadable answer
 * included, leaves the row as it is.
 */
export const pollRiftActiveUserTransactions = async ({
	identity,
	transactions
}: {
	identity: Identity;
	transactions: ActiveUserTransaction[];
}): Promise<void> => {
	const round = [...transactions]
		.sort(({ id: a }, { id: b }) => (lastReadAt.get(a) ?? 0) - (lastReadAt.get(b) ?? 0))
		.slice(0, RIFT_MAX_ORDER_READS_PER_TICK);

	for (const tx of round) {
		// A read now would wait out the rest of a 429's `Retry-After`, and with it the tick every
		// provider's poller shares: the rest of the round waits for a later tick instead.
		if (isRiftRateLimited()) {
			return;
		}

		let rateLimited = false;

		try {
			await pollRiftActiveUserTransaction({ tx, identity });
		} catch (err: unknown) {
			rateLimited = err instanceof RiftApiError && err.status === 429;

			if (!rateLimited) {
				consoleError(err);
			}
		}

		// A row Rift answered with a 429 counts as read too, so that the next round starts with the
		// rows this one did not reach, and no row keeps the others waiting.
		lastReadAt.set(tx.id, Date.now());

		if (rateLimited) {
			return;
		}
	}
};

// The chain id of an EVM token id, or `undefined` for any other chain.
const evmChainIdOfTokenId = (tokenId: TokenId): bigint | undefined => {
	if ('EvmNative' in tokenId) {
		return tokenId.EvmNative;
	}

	if ('Erc20' in tokenId) {
		return tokenId.Erc20[1];
	}

	if ('Erc4626' in tokenId) {
		return tokenId.Erc4626[1];
	}
};

/**
 * Reloads the EVM balances a terminal Rift row may have moved: its EVM token, and that network's
 * native token. A delivery lands on the destination chain and a refund on the source chain, so this
 * runs whatever the outcome; the Bitcoin side is the wallet worker's. A token no longer enabled is
 * skipped. No wallet worker refreshes EVM balances, and the swap modal closed at broadcast, so nothing
 * else does when the order settles.
 *
 * Best effort and not awaited: a balance that fails to reload is what the periodic poll resolves.
 */
export const reloadRiftEvmBalances = ({
	tx,
	tokens
}: {
	tx: ActiveUserTransaction;
	tokens: Token[];
}): void => {
	if (!('Rift' in tx.data)) {
		return;
	}

	// The native token is found from the row's chain rather than from its token, so that it is
	// reloaded even when that token was disabled since. A non-EVM token id has no chain.
	const candidates = [tx.data.Rift.source_token, tx.data.Rift.dest_token].flatMap((tokenId) => {
		const chainId = evmChainIdOfTokenId(tokenId);

		return isNullish(chainId)
			? []
			: [
					findTokenByBackendTokenId({ tokenId, tokens }),
					findTokenByBackendTokenId({ tokenId: { EvmNative: chainId }, tokens })
				];
	});

	const evmTokens = new Map<Token['id'], Token>();

	for (const token of candidates) {
		if (nonNullish(token) && isReloadableEthereumBalanceToken(token)) {
			evmTokens.set(token.id, token);
		}
	}

	for (const token of evmTokens.values()) {
		reloadEthereumBalance(token).catch(consoleError);
	}
};
