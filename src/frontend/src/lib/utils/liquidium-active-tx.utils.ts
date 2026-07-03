import type {
	ActiveUserTransaction,
	ActiveUserTransactionRef,
	ActiveUserTransactionStatus,
	LiquidiumAction
} from '$declarations/backend/backend.did';
import { LIQUIDIUM_PROVIDER_ID } from '$lib/constants/liquidium.constants';
import {
	LIQUIDIUM_EXTERNAL_REF_KEYS,
	type LiquidiumActionKey,
	type LiquidiumExternalRefKey
} from '$lib/types/liquidium-active-tx';
import { nonNullish } from '@dfinity/utils';
import type { Activity } from '@liquidium/client';

export const isLiquidiumActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	'Liquidium' in tx.data;

// Wire-format `(key, value)` array → keyed lookup.
export const toLiquidiumExternalRefsMap = (
	refs: ActiveUserTransactionRef[]
): Partial<Record<LiquidiumExternalRefKey, string>> => {
	const map: Partial<Record<LiquidiumExternalRefKey, string>> = {};

	for (const { key, value } of refs) {
		map[key as LiquidiumExternalRefKey] = value;
	}

	return map;
};

// Builds a deterministic `(key, value)` external-ref array, dropping empties.
export const toLiquidiumExternalRefs = (
	refs: Partial<Record<LiquidiumExternalRefKey, string>>
): ActiveUserTransactionRef[] =>
	(Object.keys(refs) as LiquidiumExternalRefKey[])
		.filter((key) => refs[key] !== undefined && refs[key] !== '')
		.sort()
		.map((key) => ({ key, value: refs[key] as string }));

export const liquidiumActionKey = (action: LiquidiumAction): LiquidiumActionKey =>
	'Supply' in action
		? 'supply'
		: 'Borrow' in action
			? 'borrow'
			: 'Repay' in action
				? 'repay'
				: 'withdraw';

// Analytics metadata for a Liquidium action — shared by the submitted and
// success/error events so they line up for the same transaction.
export const liquidiumTrackingMetadata = ({
	action,
	token,
	tokenAmount,
	error
}: {
	action: LiquidiumActionKey;
	token: string;
	tokenAmount: string;
	error?: string;
}): Record<string, string> => ({
	dApp: LIQUIDIUM_PROVIDER_ID,
	action,
	token,
	tokenAmount,
	...(nonNullish(error) ? { error } : {})
});

// Terminal-row metadata, read off the `external_refs`/`data` snapshot so it
// survives refresh/resume. Mirrors `buildOneSecSwapTrackingMetadata`.
export const buildLiquidiumTrackingMetadata = ({
	tx
}: {
	tx: ActiveUserTransaction;
}): Record<string, string> => {
	const refs = toLiquidiumExternalRefsMap(tx.external_refs);

	return liquidiumTrackingMetadata({
		action: 'Liquidium' in tx.data ? liquidiumActionKey(tx.data.Liquidium.action) : 'supply',
		token: refs[LIQUIDIUM_EXTERNAL_REF_KEYS.ASSET_SYMBOL] ?? '',
		tokenAmount: refs[LIQUIDIUM_EXTERNAL_REF_KEYS.AMOUNT] ?? '',
		error: tx.error[0]
	});
};

// Liquidium activity status → AUT status; `undefined` for states that don't advance the row.
export const liquidiumActivityToStatus = (
	status: Activity['status']
): ActiveUserTransactionStatus | undefined => {
	switch (status.state) {
		// `completed` for inflows/withdrawals; `active` once a borrow's loan is live.
		case 'completed':
		case 'active':
			return { Succeeded: null };
		case 'failed':
		case 'expired':
			return { Failed: null };
		case 'confirming':
		case 'processing':
			return { Executing: null };
		default:
			// `action_required` (and any unknown state) → no advance.
			return undefined;
	}
};
