import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { fetchNearIntentsStatus } from '$lib/rest/near-intents.rest';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import {
	NEAR_INTENTS_EXTERNAL_REF_KEYS,
	type NearIntentsExternalRefKey
} from '$lib/types/near-intents';
import { advanceStatus } from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import {
	nearIntentsStatusError,
	toNearIntentsActiveUserTransactionStatus,
	toNearIntentsExternalRefs,
	toNearIntentsExternalRefsMap,
	toNearIntentsLearnedRefs
} from '$lib/utils/near-intents-active-tx.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

// 1Click `/status` is a stateless REST endpoint keyed by depositAddress (+ the
// optional depositMemo), both snapshotted in `external_refs` at creation time.
// The row is re-derived from `/status` each tick, so it resumes across refresh /
// logout with no SDK "transfer id" gap to work around (the deposit address IS
// the durable poll key).
const pollNearIntentsActiveUserTransaction = async ({
	tx,
	identity
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
}): Promise<void> => {
	try {
		const refs = toNearIntentsExternalRefsMap(tx.external_refs);
		const depositAddress = refs[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS];
		const depositMemo = refs[NEAR_INTENTS_EXTERNAL_REF_KEYS.DEPOSIT_MEMO];

		// Not pollable without the deposit address.
		if (isNullish(depositAddress)) {
			return;
		}

		const { status, swapDetails } = await fetchNearIntentsStatus({ depositAddress, depositMemo });

		const candidate = toNearIntentsActiveUserTransactionStatus(status);

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

		const error = nonNullish(next) && 'Failed' in next ? nearIntentsStatusError(status) : undefined;

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

export const pollNearIntentsActiveUserTransactions = async ({
	identity,
	transactions
}: {
	identity: Identity;
	transactions: ActiveUserTransaction[];
}): Promise<void> => {
	if (transactions.length === 0) {
		return;
	}

	await Promise.all(
		transactions.map((tx) => pollNearIntentsActiveUserTransaction({ tx, identity }))
	);
};
