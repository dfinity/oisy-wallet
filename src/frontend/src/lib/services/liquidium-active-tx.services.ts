import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { infuraProviders } from '$eth/providers/infura.providers';
import { liquidiumClient } from '$lib/api/liquidium.api';
import { LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS } from '$lib/constants/liquidium.constants';
import {
	applyActiveUserTransactionPollUpdate,
	deleteActiveUserTransaction,
	reloadActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
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
import { ActivityFilter, type Activity, type LiquidiumClient } from '@liquidium/client';
import { isHexString } from 'ethers/utils';
import { get } from 'svelte/store';

/**
 * How many consecutive ticks each repay row has been seen without its txid and unwritten. The repay
 * renews its row while the broadcast is pending, so the count only runs once nobody is working on
 * it. In memory, like `cycles-mint-active-tx.services`: a refresh restarts the count, which only
 * ever delays the cleanup.
 */
const repayTxidObservations = new Map<string, { updatedAtNs: bigint; count: number }>();

// Test seam — module-level state would otherwise leak between cases.
export const resetLiquidiumRepayTxidObservations = (): void => {
	repayTxidObservations.clear();
};

const recordRepayTxidObservation = ({ id, updated_at_ns }: ActiveUserTransaction): number => {
	const previous = repayTxidObservations.get(id);

	const count =
		nonNullish(previous) && previous.updatedAtNs === updated_at_ns ? previous.count + 1 : 1;

	repayTxidObservations.set(id, { updatedAtNs: updated_at_ns, count });

	return count;
};

// A repay records its row before the broadcast and adds the txid after it (see
// `executeLiquidiumRepay`). Nothing can poll a row without one, and it would lower the repay max
// for good, so once it has gone unwritten for the grace period it is deleted, as the repay deletes
// the row of a broadcast that failed.
const dropRepayWithoutTxid = async ({
	tx,
	identity
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
}): Promise<void> => {
	if (recordRepayTxidObservation(tx) < LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS) {
		return;
	}

	// This tab's copy can be stale: a txid write whose response was lost, or a write made from
	// another tab (the txid, or a lease renewal of a broadcast still pending there), never reached
	// it. The backend's row decides, read right before the delete. Either write keeps the row, and
	// the store now holds the backend's copy for the next tick to count from. A failed read or
	// delete is retried on the next tick.
	const current = await reloadActiveUserTransaction({ identity, id: tx.id });

	if (
		nonNullish(current) &&
		(current.updated_at_ns > tx.updated_at_ns ||
			nonNullish(
				toLiquidiumExternalRefsMap(current.external_refs)[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]
			))
	) {
		repayTxidObservations.delete(tx.id);
		return;
	}

	await deleteActiveUserTransaction({ identity, id: tx.id });

	repayTxidObservations.delete(tx.id);
};

// Bridges `0x`/case differences between oisy's broadcast hash and the SDK's txid.
const normalizeTxid = (value: string): string => value.toLowerCase().replace(/^0x/, '');

// Outflows (borrow/withdraw) correlate by the receipt `id` (txid may come late); inflows
// (supply) by the unique on-chain txid.
const resolveLiquidiumActivity = async ({
	client,
	profileId,
	txid,
	outflowId
}: {
	client: LiquidiumClient;
	profileId: string;
	txid?: string;
	outflowId?: string;
}): Promise<Activity | undefined> => {
	if (nonNullish(outflowId)) {
		const response = await client.activities.getStatus({ id: outflowId, profileId });
		return response.found ? response.activity : undefined;
	}

	if (nonNullish(txid)) {
		const target = normalizeTxid(txid);
		const activities = await client.activities.list({ profileId, filter: ActivityFilter.all });
		return activities.find(({ txids }) => (txids ?? []).some((t) => normalizeTxid(t) === target));
	}

	return undefined;
};

// A repay is matched by the txid of the transfer we broadcast. One that reverted on Ethereum moved
// nothing, so Liquidium never lists it, and only the receipt can end the row. An ICRC transfer
// either lands or throws at broadcast, and a BTC transaction cannot revert.
const isRevertedEthRepay = async ({
	tx,
	txid
}: {
	tx: ActiveUserTransaction;
	txid?: string;
}): Promise<boolean> => {
	if (
		!('Liquidium' in tx.data) ||
		!('Repay' in tx.data.Liquidium.action) ||
		isNullish(txid) ||
		!isHexString(txid, 32)
	) {
		return false;
	}

	const receipt = await infuraProviders(ETHEREUM_NETWORK_ID).getTransactionReceipt(txid);

	return receipt?.status === 0;
};

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
		const outflowId = refs[LIQUIDIUM_EXTERNAL_REF_KEYS.OUTFLOW_ID];

		if (isNullish(txid) && 'Liquidium' in tx.data && 'Repay' in tx.data.Liquidium.action) {
			await dropRepayWithoutTxid({ tx, identity });
			return;
		}

		repayTxidObservations.delete(tx.id);

		// Not pollable without a profile and either a txid or an outflow id.
		if (isNullish(profileId) || (isNullish(txid) && isNullish(outflowId))) {
			return;
		}

		const activity = await resolveLiquidiumActivity({ client, profileId, txid, outflowId });

		const candidate = nonNullish(activity)
			? liquidiumActivityToStatus(activity.status)
			: (await isRevertedEthRepay({ tx, txid }))
				? { Failed: null }
				: undefined;

		if (isNullish(candidate)) {
			return;
		}

		const next = advanceStatus({ current: tx.status, candidate });

		if (isNullish(next)) {
			return;
		}

		const error = 'Failed' in candidate ? get(i18n).liquidium.text.transaction_failed : undefined;

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
