import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { liquidiumClient } from '$lib/api/liquidium.api';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import { i18n } from '$lib/stores/i18n.store';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import { advanceStatus } from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import {
	liquidiumActivityToStatus,
	toLiquidiumExternalRefsMap
} from '$lib/utils/liquidium-active-tx.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { ActivityFilter, ActivityStatus, type LiquidiumClient } from '@liquidium/client';
import { get } from 'svelte/store';

// Bridges `0x`/case differences between oisy's broadcast hash and the SDK's txid.
const normalizeTxid = (value: string): string => value.toLowerCase().replace(/^0x/, '');

const pollLiquidiumActiveUserTransaction = async ({
	tx,
	identity,
	client
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
	client: LiquidiumClient;
}): Promise<void> => {
	try {
		const refs = toLiquidiumExternalRefsMap(tx.external_refs);
		const profileId = refs[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID];
		const txid = refs[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID];

		// Both persisted at supply time; a row missing either isn't pollable yet.
		if (isNullish(profileId) || isNullish(txid)) {
			return;
		}

		const target = normalizeTxid(txid);
		const activities = await client.activities.list({ profileId, filter: ActivityFilter.all });

		// A unique on-chain txid pins the exact activity; `filter: all` includes
		// completed legs, so a confirmed/failed one terminalizes the row.
		const activity = activities.find(
			({ txid: activityTxid, txids }) =>
				(nonNullish(activityTxid) && normalizeTxid(activityTxid) === target) ||
				(txids ?? []).some((t) => normalizeTxid(t) === target)
		);

		if (isNullish(activity)) {
			return;
		}

		const candidate = liquidiumActivityToStatus(activity.status);

		if (isNullish(candidate)) {
			return;
		}

		const next = advanceStatus({ current: tx.status, candidate });

		if (isNullish(next)) {
			return;
		}

		const error =
			activity.status === ActivityStatus.failed
				? get(i18n).liquidium.text.transaction_failed
				: undefined;

		await applyActiveUserTransactionPollUpdate({
			identity,
			tx,
			update: {
				status: next,
				...(nonNullish(error) ? { error } : {})
			}
		});
	} catch (err: unknown) {
		consoleError(err);
	}
};

export const pollLiquidiumActiveUserTransactions = async ({
	identity,
	transactions
}: {
	identity: Identity;
	transactions: ActiveUserTransaction[];
}): Promise<void> => {
	if (transactions.length === 0) {
		return;
	}

	const client = liquidiumClient({ identity });

	await Promise.all(
		transactions.map((tx) => pollLiquidiumActiveUserTransaction({ tx, identity, client }))
	);
};
