import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import type { OptionEthAddress } from '$eth/types/address';
import { fetchNearIntentsStatus } from '$lib/rest/near-intents.rest';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import { readEvmSourceTxOutcome } from '$lib/services/evm-source-tx.services';
import {
	NEAR_INTENTS_EXTERNAL_REF_KEYS,
	type NearIntentsExternalRefKey
} from '$lib/types/near-intents';
import { advanceStatus } from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import {
	isNearIntentsDepositExpired,
	nearIntentsDepositExpiredError,
	nearIntentsDepositOutcomeToUpdate,
	nearIntentsStatusError,
	toNearIntentsActiveUserTransactionStatus,
	toNearIntentsExternalRefs,
	toNearIntentsExternalRefsMap,
	toNearIntentsLearnedRefs
} from '$lib/utils/near-intents-active-tx.utils';
import { findEvmNetworkByChainId } from '$lib/utils/network.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

// The outcome of the row's EVM deposit transaction, for a row that recorded one. Not readable
// without the transaction's hash, nonce and chain, or the address that signed it.
const readEvmDepositUpdate = async ({
	tx,
	refs,
	userAddress,
	confirmedNonceByChainId
}: {
	tx: ActiveUserTransaction;
	refs: Partial<Record<NearIntentsExternalRefKey, string>>;
	userAddress: OptionEthAddress;
	confirmedNonceByChainId: Map<string, Promise<number>>;
}): Promise<ReturnType<typeof nearIntentsDepositOutcomeToUpdate>> => {
	const hash = refs[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_TX_HASH];
	const nonce = refs[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_TX_NONCE];
	const chainId = refs[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_CHAIN_ID];

	if (isNullish(hash) || isNullish(nonce) || isNullish(chainId) || isNullish(userAddress)) {
		return;
	}

	const network = findEvmNetworkByChainId(BigInt(chainId));
	const txNonce = Number(nonce);

	if (isNullish(network) || Number.isNaN(txNonce)) {
		consoleError(`NEAR Intents row ${tx.id} has no usable deposit chain or nonce`);
		return;
	}

	const outcome = await readEvmSourceTxOutcome({
		rowId: tx.id,
		hash,
		txNonce,
		network,
		userAddress,
		confirmedNonceByChainId
	});

	if (outcome === 'unknown') {
		consoleError(`Unexpected receipt for NEAR Intents deposit transaction ${hash}`);
	}

	return nearIntentsDepositOutcomeToUpdate(outcome);
};

// 1Click `/status` is a stateless REST endpoint keyed by depositAddress (+ the
// optional depositMemo), both snapshotted in `external_refs` at creation time.
// The row is re-derived from `/status` each tick, so it resumes across refresh /
// logout with no SDK "transfer id" gap to work around (the deposit address IS
// the durable poll key).
const pollNearIntentsActiveUserTransaction = async ({
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
	try {
		const refs = toNearIntentsExternalRefsMap(tx.external_refs);
		const depositAddress = refs[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS];
		const depositMemo = refs[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_MEMO];

		// Not pollable without the deposit address.
		if (isNullish(depositAddress)) {
			return;
		}

		const { status, swapDetails, quoteResponse } = await fetchNearIntentsStatus({
			depositAddress,
			depositMemo
		});

		// Until 1Click processes the deposit: a submitted hash (`KNOWN_DEPOSIT_TX`) does not
		// establish that funds have arrived.
		const evmDepositUpdate =
			status === 'PENDING_DEPOSIT' || status === 'KNOWN_DEPOSIT_TX'
				? await readEvmDepositUpdate({ tx, refs, userAddress, confirmedNonceByChainId })
				: undefined;

		// The source chain's verdict names the cause, so it wins over the signed quote deadline.
		const depositUpdate =
			evmDepositUpdate ??
			((await isNearIntentsDepositExpired({ status, quoteResponse, depositAddress }))
				? { status: { Failed: null }, error: nearIntentsDepositExpiredError() }
				: undefined);

		const candidate = depositUpdate?.status ?? toNearIntentsActiveUserTransactionStatus(status);

		const next = nonNullish(candidate)
			? advanceStatus({ current: tx.status, candidate })
			: undefined;

		// Persist newly-learned origin/destination tx hashes even when the status
		// itself doesn't advance (e.g. row already Executing).
		const learned = toNearIntentsLearnedRefs(swapDetails);
		const hasNewRefs = (Object.keys(learned) as NearIntentsExternalRefKey[]).some(
			(key) => refs[key] !== learned[key]
		);
		const externalRefs = hasNewRefs
			? toNearIntentsExternalRefs({ ...refs, ...learned })
			: undefined;

		const error =
			nonNullish(next) && 'Failed' in next
				? (depositUpdate?.error ?? nearIntentsStatusError(status))
				: undefined;

		const update = {
			...(nonNullish(next) ? { status: next } : {}),
			...(nonNullish(error) ? { error } : {}),
			...(nonNullish(externalRefs) ? { externalRefs } : {})
		};

		if (Object.keys(update).length === 0) {
			return;
		}

		await applyActiveUserTransactionPollUpdate({ identity, tx, update });
	} catch (err: unknown) {
		consoleError(err);
	}
};

/**
 * Advances the pending NEAR Intents rows from 1Click's `/status`, and, until 1Click processes the
 * deposit, a row with an EVM deposit transaction from the source chain too.
 *
 * `userAddress` is the caller's EVM address, which signed every EVM deposit: rows are
 * principal-scoped and OISY derives one EVM address per principal. While it is unavailable only
 * the source-chain check is skipped. `confirmedNonceByChainId` is shared with the other EVM
 * pollers of the same tick, so rows on one chain cost one nonce read whatever their provider.
 */
export const pollNearIntentsActiveUserTransactions = async ({
	identity,
	transactions,
	userAddress,
	confirmedNonceByChainId = new Map<string, Promise<number>>()
}: {
	identity: Identity;
	transactions: ActiveUserTransaction[];
	userAddress: OptionEthAddress;
	confirmedNonceByChainId?: Map<string, Promise<number>>;
}): Promise<void> => {
	if (transactions.length === 0) {
		return;
	}

	await Promise.all(
		transactions.map((tx) =>
			pollNearIntentsActiveUserTransaction({ tx, identity, userAddress, confirmedNonceByChainId })
		)
	);
};
