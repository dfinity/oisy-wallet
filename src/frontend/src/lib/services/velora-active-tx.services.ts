import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { infuraProviders } from '$eth/providers/infura.providers';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import { VELORA_EXTERNAL_REF_KEYS, type VeloraExternalRefKey } from '$lib/types/velora-swap';
import { advanceStatus } from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import { findEvmNetworkByChainId } from '$lib/utils/network.utils';
import {
	toVeloraDeltaLearnedRefs,
	toVeloraDeltaStatus,
	toVeloraExternalRefs,
	toVeloraExternalRefsMap,
	toVeloraMarketOutcome,
	veloraDeltaStatusError,
	veloraMarketOutcomeError,
	veloraMarketOutcomeToStatus,
	type VeloraMarketOutcome
} from '$lib/utils/velora-active-tx.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { constructSimpleSDK } from '@velora-dex/sdk';

/**
 * Counts how many consecutive polls have observed a Market row as
 * replaced-or-dropped. A single observation is not trusted: the receipt read and
 * the confirmed-nonce read are not atomic, so a transaction that has just
 * confirmed can be seen with an advanced nonce while a lagging RPC node still
 * answers `null` for its receipt. Writing `Failed` there would be a permanent
 * wrong verdict on a successful swap.
 *
 * Deliberately in-memory: a refresh resets the count, which at worst delays
 * terminalization by one tick and never produces a wrong verdict.
 */
const replacementObservations = new Map<string, number>();

// Test seam — module-level state would otherwise leak between cases.
export const resetVeloraReplacementObservations = (): void => {
	replacementObservations.clear();
};

const REPLACEMENT_OBSERVATIONS_REQUIRED = 2;

const recordReplacementObservation = (txId: string): number => {
	const count = (replacementObservations.get(txId) ?? 0) + 1;
	replacementObservations.set(txId, count);
	return count;
};

const applyUpdate = async ({
	identity,
	tx,
	candidate,
	error,
	learned,
	refs
}: {
	identity: Identity;
	tx: ActiveUserTransaction;
	candidate: ReturnType<typeof toVeloraDeltaStatus>;
	error: string | undefined;
	learned: Partial<Record<VeloraExternalRefKey, string>>;
	refs: Partial<Record<VeloraExternalRefKey, string>>;
}): Promise<void> => {
	const next = nonNullish(candidate) ? advanceStatus({ current: tx.status, candidate }) : undefined;

	// Persist newly-learned hashes even when the status itself doesn't advance.
	const hasNewRefs = (Object.keys(learned) as VeloraExternalRefKey[]).some(
		(key) => refs[key] !== learned[key]
	);
	const externalRefs = hasNewRefs ? toVeloraExternalRefs({ ...refs, ...learned }) : undefined;

	const update = {
		...(nonNullish(next) ? { status: next } : {}),
		...(nonNullish(next) && 'Failed' in next && nonNullish(error) ? { error } : {}),
		...(nonNullish(externalRefs) ? { externalRefs } : {})
	};

	if (Object.keys(update).length === 0) {
		return;
	}

	await applyActiveUserTransactionPollUpdate({ identity, tx, update });
};

// Velora's Delta v2 API is the source of truth: an unauthenticated, stateless
// endpoint keyed by the auction id snapshotted in `external_refs` at creation
// time, so the row resumes across refresh / logout.
const pollVeloraDeltaTransaction = async ({
	tx,
	identity,
	refs
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
	refs: Partial<Record<VeloraExternalRefKey, string>>;
}): Promise<void> => {
	const auctionId = refs[VELORA_EXTERNAL_REF_KEYS.AUCTION_ID];
	const chainId = refs[VELORA_EXTERNAL_REF_KEYS.CHAIN_ID];

	// Not pollable without the auction id.
	if (isNullish(auctionId) || isNullish(chainId)) {
		return;
	}

	const sdk = constructSimpleSDK({ chainId: Number(chainId), fetch: window.fetch });

	const auction = await sdk.delta.getDeltaOrderById(auctionId);

	const candidate = toVeloraDeltaStatus(auction);

	if (isNullish(candidate)) {
		consoleError(`Unmapped Velora Delta order status: ${auction.status}`);
	}

	await applyUpdate({
		identity,
		tx,
		candidate,
		error: veloraDeltaStatusError(auction.status),
		learned: toVeloraDeltaLearnedRefs(auction),
		refs
	});
};

// The source chain is the source of truth for a Market swap: the receipt's
// `status` says whether it executed or reverted, and the sender's confirmed
// nonce is what distinguishes a transaction still in the mempool from one that
// was replaced or dropped.
const pollVeloraMarketTransaction = async ({
	tx,
	identity,
	refs,
	userAddress,
	confirmedNonceByChainId
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
	refs: Partial<Record<VeloraExternalRefKey, string>>;
	userAddress: EthAddress;
	confirmedNonceByChainId: Map<string, Promise<number>>;
}): Promise<void> => {
	const hash = refs[VELORA_EXTERNAL_REF_KEYS.TX_HASH];
	const nonce = refs[VELORA_EXTERNAL_REF_KEYS.TX_NONCE];
	const chainId = refs[VELORA_EXTERNAL_REF_KEYS.CHAIN_ID];

	// Not pollable without the transaction hash, its nonce, or the chain.
	if (isNullish(hash) || isNullish(nonce) || isNullish(chainId)) {
		return;
	}

	const network = findEvmNetworkByChainId(BigInt(chainId));

	if (isNullish(network)) {
		consoleError(`Unsupported Velora Market chain id: ${chainId}`);
		return;
	}

	const txNonce = Number(nonce);

	if (Number.isNaN(txNonce)) {
		consoleError(`Unparsable Velora Market nonce for transaction ${hash}: ${nonce}`);
		return;
	}

	const provider = infuraProviders(network.id);

	const receipt = await provider.getTransactionReceipt(hash);

	let outcome: VeloraMarketOutcome = toVeloraMarketOutcome({ receipt, txNonce });

	// Only a missing receipt is ambiguous — it reads the same whether the
	// transaction is still in the mempool or was replaced. The confirmed nonce
	// tells the two apart.
	if (isNullish(receipt)) {
		// Several rows can share a chain within a tick; one nonce read serves all.
		const confirmedNoncePromise =
			confirmedNonceByChainId.get(chainId) ?? provider.getTransactionCountLatest(userAddress);
		confirmedNonceByChainId.set(chainId, confirmedNoncePromise);

		const confirmedNonce = await confirmedNoncePromise;

		outcome = toVeloraMarketOutcome({ receipt, confirmedNonce, txNonce });

		if (outcome === 'replaced') {
			// The nonce read may have raced our own confirmation: re-read the receipt
			// before counting this as evidence that the transaction can never mine.
			outcome = toVeloraMarketOutcome({
				receipt: await provider.getTransactionReceipt(hash),
				confirmedNonce,
				txNonce
			});
		}
	}

	if (
		outcome === 'replaced' &&
		recordReplacementObservation(tx.id) < REPLACEMENT_OBSERVATIONS_REQUIRED
	) {
		outcome = 'pending';
	} else {
		// The row either stopped looking replaced or terminalizes as Failed below;
		// either way it is no longer under observation.
		replacementObservations.delete(tx.id);
	}

	if (outcome === 'unknown') {
		consoleError(`Unexpected Velora Market receipt for transaction ${hash}`);
	}

	await applyUpdate({
		identity,
		tx,
		candidate: veloraMarketOutcomeToStatus(outcome),
		error: veloraMarketOutcomeError(outcome),
		learned: {},
		refs
	});
};

/**
 * Advances the pending Velora rows, routed on the execution mode stored in the
 * row's `data`.
 *
 * `userAddress` is the caller's EVM address. AUT rows are principal-scoped and
 * OISY derives one EVM address per principal, so it is by construction the
 * address that signed every Market row in the set; Market rows are skipped when
 * it is unavailable, while Delta rows are unaffected.
 */
export const pollVeloraActiveUserTransactions = async ({
	identity,
	transactions,
	userAddress
}: {
	identity: Identity;
	transactions: ActiveUserTransaction[];
	userAddress: OptionEthAddress;
}): Promise<void> => {
	if (transactions.length === 0) {
		return;
	}

	const confirmedNonceByChainId = new Map<string, Promise<number>>();

	await Promise.all(
		transactions.map(async (tx) => {
			try {
				if (!('Velora' in tx.data)) {
					return;
				}

				const refs = toVeloraExternalRefsMap(tx.external_refs);

				if ('Delta' in tx.data.Velora.mode) {
					await pollVeloraDeltaTransaction({ tx, identity, refs });
					return;
				}

				if (isNullish(userAddress)) {
					return;
				}

				await pollVeloraMarketTransaction({
					tx,
					identity,
					refs,
					userAddress,
					confirmedNonceByChainId
				});
			} catch (err: unknown) {
				// A transient RPC or API blip must leave the row pending so the next
				// tick retries; one failing row never poisons the batch.
				consoleError(err);
			}
		})
	);
};
