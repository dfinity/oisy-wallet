import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionRef
} from '$declarations/backend/backend.did';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { toBackendTokenId } from '$lib/utils/token-id.utils';
import type { XrpAddress } from '$xrp/types/address';
import { XrpNetworks, type XrpNetworkType } from '$xrp/types/network';
import { XRP_EXTERNAL_REF_KEYS, type XrpExternalRefKey } from '$xrp/types/xrp-active-tx';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';

export const isXrpActiveUserTransaction = (tx: ActiveUserTransaction): boolean => 'Xrp' in tx.data;

/**
 * Builds the `Xrp` AUT data variant from the values fixed at signing time.
 *
 * Returns `undefined` when the token cannot be mapped to a backend `TokenId` —
 * XRPL testnet has no variant — which the caller treats as "this send cannot be
 * guarded", not as "send it anyway".
 */
export const toXrpData = ({
	token,
	source,
	destination,
	destinationTag,
	amount,
	fee
}: {
	token: Token;
	source: XrpAddress;
	destination: XrpAddress;
	destinationTag?: number;
	amount: XrpBalance;
	fee: XrpBalance;
}): ActiveUserTransactionData | undefined => {
	const backendToken = toBackendTokenId(token);

	if (isNullish(backendToken)) {
		return undefined;
	}

	return {
		Xrp: {
			token: backendToken,
			source_address: source,
			destination_address: destination,
			// An omitted tag must not become `0`, which is a distinct, valid tag —
			// the same distinction `buildXrpPayment` keeps.
			destination_tag: nonNullish(destinationTag) ? [destinationTag] : [],
			amount,
			fee
		}
	};
};

/**
 * Builds a deterministic `(key, value)` external-ref array, dropping empties.
 * Mirrors `toNearIntentsExternalRefs`.
 */
export const toXrpExternalRefs = (
	refs: Partial<Record<XrpExternalRefKey, string>>
): ActiveUserTransactionRef[] =>
	(Object.keys(refs) as XrpExternalRefKey[])
		.filter((key) => refs[key] !== undefined && refs[key] !== '')
		.sort()
		.map((key) => ({ key, value: refs[key] as string }));

// Wire-format `(key, value)` array → keyed lookup.
export const toXrpExternalRefsMap = (
	refs: ActiveUserTransactionRef[]
): Partial<Record<XrpExternalRefKey, string>> => {
	const map: Partial<Record<XrpExternalRefKey, string>> = {};

	for (const { key, value } of refs) {
		map[key as XrpExternalRefKey] = value;
	}

	return map;
};

/**
 * Snapshots the fields needed to render the row in a later session, when the
 * token may no longer be enabled and nothing else can supply them.
 */
export const toXrpDisplayRefs = ({
	token,
	amount
}: {
	token: Token;
	amount: string;
}): Partial<Record<XrpExternalRefKey, string>> => ({
	[XRP_EXTERNAL_REF_KEYS.AMOUNT]: amount,
	[XRP_EXTERNAL_REF_KEYS.TOKEN_SYMBOL]: token.symbol,
	[XRP_EXTERNAL_REF_KEYS.NETWORK_SYMBOL]: token.network.name
});

/**
 * The XRP network the row's payment was signed for, taken from the token the
 * backend validated rather than from a separate field that could disagree with
 * it. `undefined` for anything else, which leaves the row unpolled rather than
 * polled against a network it never named.
 */
export const xrpActiveUserTransactionNetwork = (
	tx: ActiveUserTransaction
): XrpNetworkType | undefined =>
	'Xrp' in tx.data && 'XrpNativeMainnet' in tx.data.Xrp.token ? XrpNetworks.mainnet : undefined;

/**
 * The values the resolver polls with, or `undefined` when the row does not carry
 * a usable pair.
 *
 * A row missing or carrying a malformed `last_ledger_sequence` is not pollable,
 * and "not pollable" has to mean "left alone": expiry is established by
 * comparing the validated ledger index against this number, so a defaulted or
 * coerced value would decide that comparison on something the row never said.
 */
export const xrpActiveUserTransactionPollKeys = (
	tx: ActiveUserTransaction
): { hash: string; lastLedgerSequence: number } | undefined => {
	const refs = toXrpExternalRefsMap(tx.external_refs);

	const hash = refs[XRP_EXTERNAL_REF_KEYS.TX_HASH];
	const rawLastLedgerSequence = refs[XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE];

	if (isNullish(hash) || hash.length === 0 || isNullish(rawLastLedgerSequence)) {
		return undefined;
	}

	// Digits only, then a safe-integer check: `Number('12 ')` and `Number('0x1f')`
	// both parse, and either would poll a ledger range the transaction was never
	// signed against.
	if (!/^\d+$/.test(rawLastLedgerSequence)) {
		return undefined;
	}

	const lastLedgerSequence = Number(rawLastLedgerSequence);

	if (!Number.isSafeInteger(lastLedgerSequence) || lastLedgerSequence <= 0) {
		return undefined;
	}

	return { hash, lastLedgerSequence };
};

/**
 * Analytics metadata for an XRP row that has just reached a terminal status.
 *
 * Read entirely off the row's own snapshot, like the swap providers' equivalents: by the time the
 * ledger decides there may be no modal, no fee store and no selected token left to ask.
 */
export interface XrpActiveUserTransactionDisplay {
	amount: string;
	symbol: string;
	network: string;
}

/**
 * What an XRP row says it sent, and where — for the row itself, its failure message and its
 * analytics event.
 *
 * The display snapshot first, and for any field it lacks, what the backend guarantees every XRP row
 * carries: the amount in drops, and an `XrpNativeMainnet` token, which can only be `XRP_TOKEN`. The
 * backend does not require the snapshot, so a row written by another client may lack it, and empty
 * strings in its place would read "Send" over a blank network line, or "Your send of   on  was …".
 *
 * `undefined` for a row that is not an XRP payment.
 */
export const xrpActiveUserTransactionDisplay = (
	tx: ActiveUserTransaction
): XrpActiveUserTransactionDisplay | undefined => {
	if (!('Xrp' in tx.data)) {
		return undefined;
	}

	const refs = toXrpExternalRefsMap(tx.external_refs);

	// Blank counts as absent: the backend bounds a ref value's length but not its content, so another
	// client can store an empty or whitespace-only one, which `??` alone would take as present.
	const snapshot = (key: XrpExternalRefKey): string | undefined => {
		const value = refs[key]?.trim();

		return notEmptyString(value) ? value : undefined;
	};

	return {
		amount:
			snapshot(XRP_EXTERNAL_REF_KEYS.AMOUNT) ??
			formatToken({
				value: tx.data.Xrp.amount,
				unitName: XRP_TOKEN.decimals,
				displayDecimals: XRP_TOKEN.decimals
			}),
		symbol: snapshot(XRP_EXTERNAL_REF_KEYS.TOKEN_SYMBOL) ?? XRP_TOKEN.symbol,
		network: snapshot(XRP_EXTERNAL_REF_KEYS.NETWORK_SYMBOL) ?? XRP_TOKEN.network.name
	};
};

export const buildXrpSendTrackingMetadata = ({
	tx
}: {
	tx: ActiveUserTransaction;
}): Record<string, string> => {
	const display = xrpActiveUserTransactionDisplay(tx);

	return {
		token: display?.symbol ?? '',
		network: display?.network ?? '',
		tokenAmount: display?.amount ?? '',
		...('Xrp' in tx.data ? { fee: tx.data.Xrp.fee.toString() } : {}),
		...(nonNullish(tx.error[0]) ? { error: tx.error[0] } : {})
	};
};

/**
 * Whether a failed record create was the backend refusing a second open payment.
 *
 * The backend holds the same invariant the send's own gate checks, and it is the one that *can*
 * hold it: the gate's read cannot be atomic with the create, so a second tab can pass the gate in
 * the window between the two. Its refusal is therefore the same refusal, and has to reach the user
 * as such rather than as "the payment could not be recorded".
 *
 * The canister throws the raw candid `Err` variant, so this matches on its shape.
 */
export const isXrpAlreadyInFlightError = (err: unknown): boolean =>
	nonNullish(err) && typeof err === 'object' && 'AlreadyInFlight' in err;
