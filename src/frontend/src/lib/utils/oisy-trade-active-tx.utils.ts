import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionRef,
	OisyTradeSide,
	TokenId
} from '$declarations/backend/backend.did';
import type { IcToken } from '$icp/types/ic-token';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { ZERO } from '$lib/constants/app.constants';
import {
	OISY_TRADE_EXTERNAL_REF_KEYS,
	type OisyTradeExternalRefKey
} from '$lib/types/oisy-trade-swap';
import { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import type { LimitOrderSide } from '$lib/utils/oisy-trade.utils';
import { toBackendTokenId, tokenIdKey } from '$lib/utils/token-id.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const isOisyTradeActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	'OisyTrade' in tx.data;

// The candid discriminant for the resolved order's side. `Sell` spends the base
// token, `Buy` the quote one — which, with the row's two token ids, is what fixes
// the base/quote orientation the ids alone cannot express.
export const toOisyTradeCandidDataSide = (side: LimitOrderSide): OisyTradeSide =>
	side === 'sell' ? { Sell: null } : { Buy: null };

/**
 * Builds the `OisyTrade` AUT data variant: the order's side plus the canonical
 * immutable trio (source token, destination token, source amount in base units).
 *
 * Everything learned mid-flow — the order id, the deposit and withdrawal block
 * indices, the submitted price and quantity, the pre-deposit balance baselines —
 * rides in `external_refs`, which need no Candid change to extend.
 *
 * Returns `undefined` when either token has no backend `TokenId`. Unlike every
 * other provider, whose callers read that as "do not track this operation", the
 * OISY Trade flow treats it as a reason to abort: the row is the recovery record,
 * and an untracked swap is exactly the stranded-funds case it exists to prevent.
 */
export const toOisyTradeData = ({
	side,
	sourceToken,
	destinationToken,
	amount
}: {
	side: LimitOrderSide;
	sourceToken: Token;
	destinationToken: Token;
	amount: bigint;
}): ActiveUserTransactionData | undefined => {
	const source_token = toBackendTokenId(sourceToken);
	const dest_token = toBackendTokenId(destinationToken);

	if (nonNullish(source_token) && nonNullish(dest_token)) {
		return {
			OisyTrade: { side: toOisyTradeCandidDataSide(side), source_token, dest_token, amount }
		};
	}
};

/**
 * Builds a deterministic `(key, value)` external-ref array, dropping empties.
 * Mirrors `toChainFusionExternalRefs`.
 */
export const toOisyTradeExternalRefs = (
	refs: Partial<Record<OisyTradeExternalRefKey, string>>
): ActiveUserTransactionRef[] =>
	(Object.keys(refs) as OisyTradeExternalRefKey[])
		.filter((key) => refs[key] !== undefined && refs[key] !== '')
		.sort()
		.map((key) => ({ key, value: refs[key] as string }));

// Wire-format `(key, value)` array → keyed lookup.
export const toOisyTradeExternalRefsMap = (
	refs: ActiveUserTransactionRef[]
): Partial<Record<OisyTradeExternalRefKey, string>> => {
	const map: Partial<Record<OisyTradeExternalRefKey, string>> = {};

	for (const { key, value } of refs) {
		map[key as OisyTradeExternalRefKey] = value;
	}

	return map;
};

/**
 * Snapshots the user-facing fields needed to render an AUT row and to fire its
 * terminal-state analytics. Uses OneSec's key names, which is what lets
 * `ActiveUserTransactionItem` render an OISY Trade row without a new layout.
 */
export const toOisyTradeDisplayRefs = ({
	sourceToken,
	destinationToken,
	amount,
	usdSourceValue
}: {
	sourceToken: Token;
	destinationToken: Token;
	amount: string;
	usdSourceValue?: string;
}): Partial<Record<OisyTradeExternalRefKey, string>> => ({
	[OISY_TRADE_EXTERNAL_REF_KEYS.AMOUNT]: amount,
	...(nonNullish(usdSourceValue)
		? { [OISY_TRADE_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE]: usdSourceValue }
		: {}),
	[OISY_TRADE_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: sourceToken.symbol,
	[OISY_TRADE_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: sourceToken.network.name,
	[OISY_TRADE_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: destinationToken.symbol,
	[OISY_TRADE_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: destinationToken.network.name
});

/**
 * A base-unit amount snapshotted as a ref, read back.
 *
 * Returns `undefined` for a ref that is missing, unparsable or negative, and the
 * caller must decline to act rather than substitute a value. Zero is the one guess
 * that must not be made here: it is not a neutral default but the most destructive
 * reading available, because `attributable` then credits this order with the whole
 * of the caller's current free balance. Settlement would withdraw a balance the user
 * deliberately parked from the Trading tab, charging them a ledger fee to do it, and
 * on the path where the order is no longer known it would let a pre-existing
 * destination balance make a killed order read as filled — succeeding a row, and
 * firing a success event, for a swap that never happened. Those are precisely the
 * two harms the baseline exists to prevent.
 *
 * Leaving the funds in custody instead is recoverable: the row stays visible and
 * keeps polling, and the Trading tab shows the balance. Moving someone's money on a
 * guess is not. Same rule, and the same reasoning, as the unknown ledger fee in
 * `withdrawFreeBalance` — not knowing a figure says nothing about what it would have
 * been, so it is never treated as an answer.
 *
 * Unreachable in practice: creation writes both baselines in the same call that
 * creates the row, so a row is never merely early in acquiring them, and no shipped
 * version of the flow wrote rows without them. A row missing one is malformed.
 */
export const toOisyTradeRefAmount = (value: string | undefined): bigint | undefined => {
	// An empty string is the one input that would slip past the parse as a *real* zero:
	// `BigInt('')` is `0n`, not an error. `toOisyTradeExternalRefs` drops empty values,
	// so a written ref never comes back this way, but the reader must not depend on the
	// writer to keep the destructive reading unreachable.
	if (isNullish(value) || value.trim() === '') {
		return undefined;
	}

	try {
		const amount = BigInt(value);

		// A free balance cannot be negative, and a negative baseline would inflate the
		// delta rather than merely mis-state it.
		return amount < ZERO ? undefined : amount;
	} catch (_: unknown) {
		return undefined;
	}
};

/**
 * Resolves a row's backend `TokenId` back to the wallet's own token.
 *
 * Settlement needs the whole `IcToken` — the ledger fee decides what counts as
 * unwithdrawable dust, and the decimals format the analytics — not just the ledger
 * id the `TokenId` carries. Matching goes through `toBackendTokenId` so the two
 * directions cannot drift; ICP resolves like any other ICRC ledger, because that
 * is how it was written.
 *
 * Takes the candidate tokens as an argument rather than reading a store, for the
 * same reason the swap utils take the pair table: a store-reading util would see an
 * empty list in every vitest run.
 */
export const findOisyTradeRowToken = ({
	tokenId,
	tokens
}: {
	tokenId: TokenId;
	tokens: Token[];
}): IcToken | undefined => {
	const key = tokenIdKey(tokenId);

	if (isNullish(key)) {
		return undefined;
	}

	return tokens.find((token): token is IcToken => {
		if (!isIcToken(token)) {
			return false;
		}

		const backendId = toBackendTokenId(token);

		return nonNullish(backendId) && tokenIdKey(backendId) === key;
	});
};

/**
 * Builds the analytics metadata for an OISY Trade row that has just reached a
 * terminal status. Same shape as every other swap provider's, resolved entirely
 * off the row's `external_refs` snapshot so it survives refresh / resume.
 */
export const buildOisyTradeSwapTrackingMetadata = ({
	tx
}: {
	tx: ActiveUserTransaction;
}): Record<string, string> => {
	const refs = toOisyTradeExternalRefsMap(tx.external_refs);

	return {
		sourceToken: refs[OISY_TRADE_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL] ?? '',
		destinationToken: refs[OISY_TRADE_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL] ?? '',
		dApp: SwapProvider.OISY_TRADE,
		tokenAmount: refs[OISY_TRADE_EXTERNAL_REF_KEYS.AMOUNT] ?? '',
		sourceNetwork: refs[OISY_TRADE_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL] ?? '',
		destinationNetwork: refs[OISY_TRADE_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL] ?? '',
		...(nonNullish(tx.error[0]) ? { error: tx.error[0] } : {})
	};
};
