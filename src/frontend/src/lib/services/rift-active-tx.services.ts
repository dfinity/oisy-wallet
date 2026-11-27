import type { ActiveUserTransaction, TokenId } from '$declarations/backend/backend.did';
import {
	isReloadableEthereumBalanceToken,
	reloadEthereumBalance
} from '$eth/services/eth-balance.services';
import type { OptionEthAddress } from '$eth/types/address';
import { RIFT_MAX_ORDER_READS_PER_TICK } from '$lib/constants/swap.constants';
import { getRiftOrder, isRiftRateLimited } from '$lib/rest/rift.rest';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import { readEvmSourceTxOutcome } from '$lib/services/evm-source-tx.services';
import { RiftApiError } from '$lib/types/errors';
import { RIFT_EXTERNAL_REF_KEYS, type RiftExternalRefKey } from '$lib/types/rift';
import type { Token } from '$lib/types/token';
import { advanceStatus } from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import { nearIntentsDepositOutcomeToUpdate } from '$lib/utils/near-intents-active-tx.utils';
import { findEvmNetworkByChainId } from '$lib/utils/network.utils';
import {
	type RiftStatusUpdate,
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

/**
 * What the source chain says of a row's EVM deposit: `Failed` once it reverted, which consumed its
 * nonce but sent Rift nothing, or was replaced, which never will; `undefined` for any other verdict,
 * for a BTC deposit, and when it cannot be read, so the row follows Rift's status. Not readable
 * without the deposit's hash, nonce and chain, or the address that signed it.
 */
const readEvmDepositUpdate = async ({
	tx,
	refs,
	userAddress,
	confirmedNonceByChainId
}: {
	tx: ActiveUserTransaction;
	refs: Partial<Record<RiftExternalRefKey, string>>;
	userAddress: OptionEthAddress;
	confirmedNonceByChainId: Map<string, Promise<number>>;
}): Promise<RiftStatusUpdate | undefined> => {
	const hash = refs[RIFT_EXTERNAL_REF_KEYS.DEPOSIT_TX];
	const nonce = refs[RIFT_EXTERNAL_REF_KEYS.DEPOSIT_NONCE];
	const chainId = refs[RIFT_EXTERNAL_REF_KEYS.DEPOSIT_CHAIN_ID];

	if (isNullish(hash) || isNullish(nonce) || isNullish(chainId) || isNullish(userAddress)) {
		return;
	}

	const txNonce = Number(nonce);
	const network = /^\d+$/.test(chainId) ? findEvmNetworkByChainId(BigInt(chainId)) : undefined;

	if (isNullish(network) || !Number.isInteger(txNonce)) {
		consoleError(`Rift row ${tx.id} has no usable deposit chain or nonce`);
		return;
	}

	try {
		const outcome = await readEvmSourceTxOutcome({
			rowId: tx.id,
			hash,
			txNonce,
			network,
			userAddress,
			confirmedNonceByChainId
		});

		if (outcome === 'unknown') {
			consoleError(`Unexpected receipt for Rift deposit transaction ${hash}`);
		}

		return nearIntentsDepositOutcomeToUpdate(outcome);
	} catch (err: unknown) {
		consoleError(err);
	}
};

const pollRiftActiveUserTransaction = async ({
	tx,
	identity,
	userAddress,
	confirmedNonceByChainId
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
	userAddress: OptionEthAddress;
	confirmedNonceByChainId: Map<string, Promise<number>>;
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

	// While Rift waits for the deposit, or once it gave up waiting: an EVM deposit that reverted or was
	// replaced never reaches it, and the source chain's verdict names the cause, so it wins over
	// Rift's `expired`.
	const depositUpdate =
		order.status === 'awaiting_deposit' || order.status === 'expired'
			? await readEvmDepositUpdate({ tx, refs, userAddress, confirmedNonceByChainId })
			: undefined;

	const statusUpdate = depositUpdate ?? toRiftStatusUpdate(order.status);

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
 * limiter, whatever `RIFT_SWAP_ENABLED` says: a row can outlive the flag. A row with an EVM deposit is
 * also read on its source chain while Rift waits for the deposit (`readEvmDepositUpdate`).
 * `userAddress` is the caller's EVM address, which signed every EVM deposit; while it is unknown only
 * that read is skipped.
 *
 * A round reads at most `RIFT_MAX_ORDER_READS_PER_TICK` rows, least recently read first, since the
 * other providers' pollers share the tick. A 429 ends the round, and the row that got it counts as
 * read, so the next round starts with the rows this one did not reach. While Rift holds requests
 * back after a 429, a round reads nothing. Any other failure, a 404 or an unreadable answer
 * included, leaves the row as it is.
 */
export const pollRiftActiveUserTransactions = async ({
	identity,
	transactions,
	userAddress
}: {
	identity: Identity;
	transactions: ActiveUserTransaction[];
	userAddress: OptionEthAddress;
}): Promise<void> => {
	// The round's own, as it runs beside the tick rather than with the other EVM pollers.
	const confirmedNonceByChainId = new Map<string, Promise<number>>();

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
			await pollRiftActiveUserTransaction({ tx, identity, userAddress, confirmedNonceByChainId });
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
