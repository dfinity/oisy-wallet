import type {
	ActiveUserTransaction,
	ActiveUserTransactionStatus
} from '$declarations/backend/backend.did';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import { i18n } from '$lib/stores/i18n.store';
import { advanceStatus } from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { loadXrpTransactionOutcome, loadXrpValidatedLedgerIndex } from '$xrp/rest/xrpl.rest';
import {
	xrpActiveUserTransactionNetwork,
	xrpActiveUserTransactionPollKeys
} from '$xrp/utils/xrp-active-tx.utils';
import {
	isXrpTransactionSuccessful,
	xrpLedgerSearchWindow
} from '$xrp/utils/xrp-transaction.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

/**
 * Resolves one open XRP record against the ledger, in a single pass.
 *
 * This is the **only** thing that resolves an XRP record. The send stops at
 * submit and never writes a terminal status, so there is one confirmation path
 * rather than two racing for an immutable write — which is also why no
 * ownership handshake is needed between an open modal and this poller.
 *
 * Only the transitions below may close a record. An unanswered lookup, a
 * malformed response, a row with no usable poll keys and a response for a
 * different hash all leave it `Pending`, because the cost of wrongly closing a
 * record is a user being told a resend is safe while the original payment can
 * still apply — the whole reason the record exists.
 */
const pollXrpActiveUserTransaction = async ({
	tx,
	identity
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
}): Promise<void> => {
	try {
		const network = xrpActiveUserTransactionNetwork(tx);
		const pollKeys = xrpActiveUserTransactionPollKeys(tx);

		if (isNullish(network) || isNullish(pollKeys)) {
			return;
		}

		const { hash, lastLedgerSequence } = pollKeys;

		// The same window `deriveXrpLedgerWindow` gives the blob, from the one value
		// the row stores — searching a different range would make the node's
		// `searched_all` answer a claim about the wrong ledgers.
		const window = xrpLedgerSearchWindow(lastLedgerSequence);

		const lookup = async () => await loadXrpTransactionOutcome({ hash, network, ...window });

		const outcome = await lookup();

		if (outcome.state === 'validated') {
			// A `tec*` result is validated too: the payment was applied and failed,
			// claiming the fee. Either way the sequence is consumed, so the record is
			// closed and the next send is free to read a fresh sequence.
			const succeeded = isXrpTransactionSuccessful(outcome.transactionResult);

			await applyXrpStatus({
				identity,
				tx,
				candidate: succeeded ? { Succeeded: null } : { Failed: null },
				error: succeeded
					? undefined
					: replacePlaceholders(get(i18n).send.error.xrp_active_transaction_failed, {
							$result: outcome.transactionResult
						})
			});

			return;
		}

		// The node positively holding the transaction in an unvalidated ledger is
		// not non-inclusion — it is the opposite. Nothing here supports closing the
		// record.
		if (outcome.state === 'pending') {
			return;
		}

		// Absent. Only a validated ledger index past `LastLedgerSequence` can turn
		// that into expiry, and the VALIDATED index specifically: the open ledger is
		// already ahead of closed-but-unvalidated ledgers, so comparing against it
		// would expire a payment that is about to validate.
		const validatedLedgerIndex = await loadXrpValidatedLedgerIndex({ network });

		if (validatedLedgerIndex <= lastLedgerSequence) {
			return;
		}

		// The lookup above and this index come from two separate calls, so the
		// lookup may have missed a payment that validated in between — and the two
		// can reach different members of a load-balanced endpoint. Expiry is only
		// final if it survives a recheck against the newer ledger state. Without
		// this, a succeeded payment is recorded as failed and the user is invited to
		// send a duplicate.
		//
		// `confirmXrpTransaction` makes the same recheck for the same reason. It
		// matters at least as much here: a terminal status is immutable on the
		// backend, so this write cannot be walked back.
		const recheck = await lookup();

		if (recheck.state === 'validated') {
			const succeeded = isXrpTransactionSuccessful(recheck.transactionResult);

			await applyXrpStatus({
				identity,
				tx,
				candidate: succeeded ? { Succeeded: null } : { Failed: null },
				error: succeeded
					? undefined
					: replacePlaceholders(get(i18n).send.error.xrp_active_transaction_failed, {
							$result: recheck.transactionResult
						})
			});

			return;
		}

		// Still reporting the transaction, unvalidated, past its expiry. That is
		// indeterminate rather than dead, so the record stays open and the next tick
		// asks again.
		if (recheck.state === 'pending') {
			return;
		}

		// Absent on both reads, past a validated ledger index the transaction can
		// never be included in. The sequence was not consumed, so the next send
		// re-reads it from the node and legitimately gets the same one.
		await applyXrpStatus({
			identity,
			tx,
			candidate: { Failed: null },
			error: get(i18n).send.error.xrp_send_expired
		});
	} catch (err: unknown) {
		// Every failure lands here as "leave it Pending": a lookup the node could
		// not answer is not evidence of anything.
		consoleError(err);
	}
};

const applyXrpStatus = async ({
	identity,
	tx,
	candidate,
	error
}: {
	identity: Identity;
	tx: ActiveUserTransaction;
	candidate: ActiveUserTransactionStatus;
	error?: string;
}): Promise<void> => {
	const status = advanceStatus({ current: tx.status, candidate });

	if (isNullish(status)) {
		return;
	}

	await applyActiveUserTransactionPollUpdate({
		identity,
		tx,
		update: {
			status,
			...(nonNullish(error) ? { error } : {})
		}
	});
};

export const pollXrpActiveUserTransactions = async ({
	identity,
	transactions
}: {
	identity: Identity;
	transactions: ActiveUserTransaction[];
}): Promise<void> => {
	if (transactions.length === 0) {
		return;
	}

	await Promise.all(transactions.map((tx) => pollXrpActiveUserTransaction({ tx, identity })));
};
