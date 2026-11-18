import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionRef,
	TokenId as BackendTokenId
} from '$declarations/backend/backend.did';
import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES } from '$lib/constants/app.constants';
import { NEAR_INTENTS_EXTERNAL_REF_KEYS } from '$lib/types/near-intents';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { toBackendTokenId } from '$lib/utils/token-id.utils';
import type { XrpAddress } from '$xrp/types/address';
import { XrpNetworks, type XrpNetworkType } from '$xrp/types/network';
import { XRP_EXTERNAL_REF_KEYS, type XrpExternalRefKey } from '$xrp/types/xrp-active-tx';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpTrustLineCustomToken, XrpTrustSetChange } from '$xrp/types/xrp-trust-line-token';
import { toXrpTrustLineToken } from '$xrp/utils/xrp-trust-line-tokens.utils';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';

export const isXrpActiveUserTransaction = (tx: ActiveUserTransaction): boolean => 'Xrp' in tx.data;

export const isXrpTrustSetActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	'XrpTrustSet' in tx.data;

// A `TrustSet` row that removes its token, as opposed to one that adds it.
export const isXrpTrustLineRemovalActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	'XrpTrustSet' in tx.data && 'Remove' in tx.data.XrpTrustSet.change;

// A send of a trust-line token rather than of XRP.
export const isXrpTokenPaymentActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	'Xrp' in tx.data && 'XrpTrustLineMainnet' in tx.data.Xrp.token;

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
 * Builds the `XrpTrustSet` AUT data variant that adds or removes a trust-line token, from the values
 * fixed at signing time. `undefined` for a token without a backend trust-line `TokenId`, which the
 * caller treats as "this cannot be guarded", not as "sign it anyway".
 */
export const toXrpTrustSetData = ({
	token,
	source,
	change,
	fee
}: {
	token: XrpTrustLineCustomToken;
	source: XrpAddress;
	change: XrpTrustSetChange;
	fee: XrpBalance;
}): ActiveUserTransactionData | undefined => {
	const backendToken = toBackendTokenId(token);

	if (isNullish(backendToken) || !('XrpTrustLineMainnet' in backendToken)) {
		return undefined;
	}

	return {
		XrpTrustSet: {
			token: backendToken,
			source_address: source,
			change: change === 'add' ? { Add: null } : { Remove: null },
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

/**
 * The refs a swap from XRP leaves `Pending` with: its own, plus how its deposit resolved on the
 * ledger. `external_refs` is replaced wholesale, so the row's poll keys and display snapshot go
 * along, and the result replaces any the row already holds.
 *
 * A real result is a short code. One longer than the backend allows can only be fabricated, and it
 * is cut to fit rather than left to refuse the update, which would hold the row — and every payment
 * from its address — open for good. Result codes are ASCII, so characters are bytes.
 */
export const toXrpLedgerResolutionRefs = ({
	tx,
	ledgerResult
}: {
	tx: ActiveUserTransaction;
	ledgerResult: string;
}): ActiveUserTransactionRef[] =>
	[
		...tx.external_refs.filter(({ key }) => key !== XRP_EXTERNAL_REF_KEYS.LEDGER_RESULT),
		{
			key: XRP_EXTERNAL_REF_KEYS.LEDGER_RESULT,
			value: ledgerResult.slice(0, ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES)
		}
	].sort(({ key: a }, { key: b }) => (a < b ? -1 : a > b ? 1 : 0));

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
 * it: a send's token, or the source token of a swap from XRP. `undefined` for
 * anything else, which leaves the row unpolled rather than polled against a
 * network it never named.
 */
export const xrpActiveUserTransactionNetwork = (
	tx: ActiveUserTransaction
): XrpNetworkType | undefined => {
	const token =
		'Xrp' in tx.data
			? tx.data.Xrp.token
			: 'XrpTrustSet' in tx.data
				? tx.data.XrpTrustSet.token
				: 'NearIntents' in tx.data
					? tx.data.NearIntents.source_token
					: undefined;

	return nonNullish(token) && ('XrpNativeMainnet' in token || 'XrpTrustLineMainnet' in token)
		? XrpNetworks.mainnet
		: undefined;
};

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

// The token a row's backend `TokenId` names: native XRP, or a trust-line token by its currency and
// issuer — with the listed token's symbol, or the one its code reads as. Never `XRP` for a token.
const xrpRowToken = (token: BackendTokenId): Token =>
	'XrpTrustLineMainnet' in token
		? toXrpTrustLineToken({
				identity: {
					currency: token.XrpTrustLineMainnet[0],
					issuer: token.XrpTrustLineMainnet[1]
				},
				network: XRP_MAINNET_NETWORK
			})
		: XRP_TOKEN;

/**
 * What an XRP row says it sent, and where — for the row itself, its failure message and its
 * analytics event.
 *
 * The display snapshot first, and for any field it lacks, what the backend guarantees every XRP row
 * carries: the amount in the token's base units, and the token itself — `XrpNativeMainnet`, which
 * can only be `XRP_TOKEN`, or a trust-line token by its currency and issuer. The backend does not
 * require the snapshot, so a row written by another client may lack it, and empty strings in its
 * place would read "Send" over a blank network line, or "Your send of   on  was …".
 *
 * A swap from XRP says the same about its deposit, read from the swap's own snapshot keys — the
 * amount it swaps and its source token and network.
 *
 * `undefined` for a row that is not an XRP payment.
 */
export const xrpActiveUserTransactionDisplay = (
	tx: ActiveUserTransaction
): XrpActiveUserTransactionDisplay | undefined => {
	const payment =
		'Xrp' in tx.data
			? {
					amount: tx.data.Xrp.amount,
					token: xrpRowToken(tx.data.Xrp.token),
					keys: {
						amount: XRP_EXTERNAL_REF_KEYS.AMOUNT,
						symbol: XRP_EXTERNAL_REF_KEYS.TOKEN_SYMBOL,
						network: XRP_EXTERNAL_REF_KEYS.NETWORK_SYMBOL
					}
				}
			: 'NearIntents' in tx.data && 'XrpNativeMainnet' in tx.data.NearIntents.source_token
				? {
						amount: tx.data.NearIntents.amount,
						token: XRP_TOKEN,
						keys: {
							amount: NEAR_INTENTS_EXTERNAL_REF_KEYS.AMOUNT,
							symbol: NEAR_INTENTS_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL,
							network: NEAR_INTENTS_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL
						}
					}
				: undefined;

	if (isNullish(payment)) {
		return undefined;
	}

	// Keyed by name, since a swap row's snapshot keys are the NEAR Intents ones.
	const refs: Partial<Record<string, string>> = toXrpExternalRefsMap(tx.external_refs);

	// Blank counts as absent: the backend bounds a ref value's length but not its content, so another
	// client can store an empty or whitespace-only one, which `??` alone would take as present.
	const snapshot = (key: string): string | undefined => {
		const value = refs[key]?.trim();

		return notEmptyString(value) ? value : undefined;
	};

	return {
		amount:
			snapshot(payment.keys.amount) ??
			formatToken({
				value: payment.amount,
				unitName: payment.token.decimals,
				displayDecimals: payment.token.decimals
			}),
		symbol: snapshot(payment.keys.symbol) ?? payment.token.symbol,
		network: snapshot(payment.keys.network) ?? payment.token.network.name
	};
};

/**
 * What a `TrustSet` row adds, and where: the token's symbol and the network, for the row, its
 * failure message and its analytics event.
 *
 * The display snapshot first, and for whatever it lacks, the token the backend validated: its
 * symbol is the listed token's or the one its currency code reads as — never `XRP`, which a row
 * written by another client would otherwise fall back to.
 *
 * `undefined` for a row that is not a `TrustSet`.
 */
export const xrpTrustSetActiveUserTransactionDisplay = (
	tx: ActiveUserTransaction
): Omit<XrpActiveUserTransactionDisplay, 'amount'> | undefined => {
	if (!('XrpTrustSet' in tx.data) || !('XrpTrustLineMainnet' in tx.data.XrpTrustSet.token)) {
		return undefined;
	}

	const refs = toXrpExternalRefsMap(tx.external_refs);

	const snapshot = (key: XrpExternalRefKey): string | undefined => {
		const value = refs[key]?.trim();

		return notEmptyString(value) ? value : undefined;
	};

	return {
		symbol:
			snapshot(XRP_EXTERNAL_REF_KEYS.TOKEN_SYMBOL) ?? xrpRowToken(tx.data.XrpTrustSet.token).symbol,
		network: snapshot(XRP_EXTERNAL_REF_KEYS.NETWORK_SYMBOL) ?? XRP_MAINNET_NETWORK.name
	};
};

export const buildXrpTrustSetTrackingMetadata = ({
	tx
}: {
	tx: ActiveUserTransaction;
}): Record<string, string> => ({
	token: xrpTrustSetActiveUserTransactionDisplay(tx)?.symbol ?? '',
	network: `${XRP_MAINNET_NETWORK.id.description}`,
	...('XrpTrustSet' in tx.data ? { fee: tx.data.XrpTrustSet.fee.toString() } : {}),
	...(nonNullish(tx.error[0]) ? { error: tx.error[0] } : {})
});

export const buildXrpSendTrackingMetadata = ({
	tx
}: {
	tx: ActiveUserTransaction;
}): Record<string, string> => {
	const display = xrpActiveUserTransactionDisplay(tx);

	return {
		token: display?.symbol ?? '',
		// The network's id, as the send wizard reports it for the same event, not the display name the
		// row renders: one event name, one shape, so grouping by `network` in Plausible holds. Taken
		// from the row's token, which `XrpNativeMainnet` pins to `XRP_TOKEN`.
		network: 'Xrp' in tx.data ? `${XRP_TOKEN.network.id.description}` : '',
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
