import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionRef,
	ActiveUserTransactionStatus
} from '$declarations/backend/backend.did';
import { ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import {
	RIFT_EXTERNAL_REF_KEYS,
	type RiftExternalRefKey,
	type RiftOrder,
	type RiftOrderStatus
} from '$lib/types/rift';
import { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { truncateUtf8Bytes } from '$lib/utils/string.utils';
import { toBackendTokenId } from '$lib/utils/token-id.utils';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import { get } from 'svelte/store';

export const isRiftActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	'Rift' in tx.data;

// A deterministic `(key, value)` external-ref array, dropping empties, as `toLifiExternalRefs`.
export const toRiftExternalRefs = (
	refs: Partial<Record<RiftExternalRefKey, string>>
): ActiveUserTransactionRef[] =>
	(Object.keys(refs) as RiftExternalRefKey[])
		.filter((key) => notEmptyString(refs[key]))
		.sort()
		.map((key) => ({ key, value: refs[key] as string }));

// Wire-format `(key, value)` array → keyed lookup.
export const toRiftExternalRefsMap = (
	refs: ActiveUserTransactionRef[]
): Partial<Record<RiftExternalRefKey, string>> => {
	const map: Partial<Record<RiftExternalRefKey, string>> = {};

	for (const { key, value } of refs) {
		map[key as RiftExternalRefKey] = value;
	}

	return map;
};

/**
 * The row's data for a Rift swap, or `undefined` for a token without a backend `TokenId`. `amount` is
 * the order's `amount_in`, in base units of the source token.
 */
export const toRiftData = ({
	sourceToken,
	destinationToken,
	amount
}: {
	sourceToken: Token;
	destinationToken: Token;
	amount: bigint;
}): ActiveUserTransactionData | undefined => {
	const source_token = toBackendTokenId(sourceToken);
	const dest_token = toBackendTokenId(destinationToken);

	if (nonNullish(source_token) && nonNullish(dest_token)) {
		return { Rift: { source_token, dest_token, amount } };
	}
};

// A custom token's symbol has no bound, and a ref over the backend's limit refuses the row, and with
// it the swap.
const toRefValue = (text: string): string =>
	truncateUtf8Bytes({ text, maxBytes: ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES });

/**
 * The refs a Rift row is created with, once its deposit is signed: the order it pays, where and with
 * which transaction, the decimals its settled amount will be formatted with, and the display metadata
 * every swap provider shares.
 */
export const toRiftCreationRefs = ({
	order: { id, deposit_address },
	depositTx,
	sourceToken,
	destinationToken,
	amount,
	usdSourceValue
}: {
	order: Pick<RiftOrder, 'id' | 'deposit_address'>;
	depositTx: string;
	sourceToken: Token;
	destinationToken: Token;
	amount: string;
	usdSourceValue?: string;
}): Partial<Record<RiftExternalRefKey, string>> => ({
	[RIFT_EXTERNAL_REF_KEYS.ORDER_ID]: id,
	[RIFT_EXTERNAL_REF_KEYS.DEPOSIT_ADDRESS]: deposit_address,
	[RIFT_EXTERNAL_REF_KEYS.DEPOSIT_TX]: depositTx,
	[RIFT_EXTERNAL_REF_KEYS.SOURCE_DECIMALS]: `${sourceToken.decimals}`,
	[RIFT_EXTERNAL_REF_KEYS.DEST_DECIMALS]: `${destinationToken.decimals}`,
	[RIFT_EXTERNAL_REF_KEYS.AMOUNT]: amount,
	...(nonNullish(usdSourceValue) && { [RIFT_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE]: usdSourceValue }),
	[RIFT_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: toRefValue(sourceToken.symbol),
	[RIFT_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: sourceToken.network.name,
	[RIFT_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: toRefValue(destinationToken.symbol),
	[RIFT_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: destinationToken.network.name
});

const DECIMALS_MAX = 36;

/**
 * `amount_out` formatted with the decimals the row saved for the token it was paid in: the source's
 * for a refund, the destination's for a delivery. `undefined` when either fails its checks, or the
 * result would not fit a ref, so the row shows its token without an amount.
 */
const formatRiftAmountOut = ({
	amountOut,
	decimals
}: {
	amountOut: Nullish<string>;
	decimals: string | undefined;
}): string | undefined => {
	const unitName = Number(decimals);

	if (
		isNullish(amountOut) ||
		!Number.isInteger(unitName) ||
		unitName < 0 ||
		unitName > DECIMALS_MAX
	) {
		return;
	}

	// At full precision: rounded, a refund could read as the whole amount sent.
	const formatted = formatToken({ value: BigInt(amountOut), unitName, displayDecimals: unitName });

	// ASCII, so its length is its byte count. A cut amount would be wrong rather than shorter.
	return formatted.length <= ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES ? formatted : undefined;
};

export interface RiftStatusUpdate {
	status: ActiveUserTransactionStatus;
	// Written with a `Failed` status only.
	error?: string;
}

/**
 * The status an order maps the row to, with its error for a `Failed` one, or `undefined` while it
 * awaits its deposit. `underfunded` stays `Executing` until Rift's refund. Rift's `frozen` is final
 * on the row: an operator's later delivery or refund will not show there, though the balance refresh
 * picks the funds up.
 */
export const toRiftStatusUpdate = (status: RiftOrderStatus): RiftStatusUpdate | undefined => {
	switch (status) {
		case 'funded':
		case 'executing':
		case 'underfunded':
			return { status: { Executing: null } };
		case 'delivered':
			return { status: { Succeeded: null } };
		case 'refunded':
			return { status: { Failed: null }, error: get(i18n).swap.error.swap_refunded };
		case 'expired':
			return { status: { Failed: null }, error: get(i18n).swap.error.rift_deposit_expired };
		case 'frozen':
			return { status: { Failed: null }, error: get(i18n).swap.error.rift_order_frozen };
		default:
			return undefined;
	}
};

/**
 * The refs an order teaches: its last status, and once it is `delivered` or `refunded` the amount paid
 * out, formatted, and the payout transaction. A value that does not fit a ref is left out.
 */
export const toRiftLearnedRefs = ({
	order: { status, amount_out, payout_tx },
	refs
}: {
	order: Pick<RiftOrder, 'status' | 'amount_out' | 'payout_tx'>;
	refs: Partial<Record<RiftExternalRefKey, string>>;
}): Partial<Record<RiftExternalRefKey, string>> => {
	if (status !== 'delivered' && status !== 'refunded') {
		return { [RIFT_EXTERNAL_REF_KEYS.STATUS]: status };
	}

	const amountOut = formatRiftAmountOut({
		amountOut: amount_out,
		decimals:
			refs[
				status === 'delivered'
					? RIFT_EXTERNAL_REF_KEYS.DEST_DECIMALS
					: RIFT_EXTERNAL_REF_KEYS.SOURCE_DECIMALS
			]
	});

	return {
		[RIFT_EXTERNAL_REF_KEYS.STATUS]: status,
		...(nonNullish(amountOut) && { [RIFT_EXTERNAL_REF_KEYS.AMOUNT_OUT]: amountOut }),
		...(notEmptyString(payout_tx) &&
			payout_tx.length <= ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES && {
				[RIFT_EXTERNAL_REF_KEYS.PAYOUT_TX]: payout_tx
			})
	};
};

/**
 * What a settled row shows it paid out, with the symbol of the token it was paid in: the destination
 * token once delivered, the source token once refunded. `undefined` until Rift has said, or without
 * the amount, so the row shows the destination token as every swap row does.
 */
export const riftPaidOut = (tx: ActiveUserTransaction): [string, string] | undefined => {
	const refs = toRiftExternalRefsMap(tx.external_refs);
	const amount = refs[RIFT_EXTERNAL_REF_KEYS.AMOUNT_OUT];
	const status = refs[RIFT_EXTERNAL_REF_KEYS.STATUS];
	const symbol =
		status === 'delivered'
			? refs[RIFT_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]
			: status === 'refunded'
				? refs[RIFT_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]
				: undefined;

	return nonNullish(amount) && nonNullish(symbol) ? [amount, symbol] : undefined;
};

/**
 * The analytics metadata of a Rift row that has just reached a terminal status, the same shape as
 * the other swap providers', from the row's snapshot. Without the row's error or Rift's text, which
 * never go to analytics (invariant 4 in `docs/ai/frontend/analytics.md`).
 */
export const buildRiftSwapTrackingMetadata = ({
	tx
}: {
	tx: ActiveUserTransaction;
}): Record<string, string> => {
	const refs = toRiftExternalRefsMap(tx.external_refs);

	return {
		sourceToken: refs[RIFT_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL] ?? '',
		destinationToken: refs[RIFT_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL] ?? '',
		dApp: SwapProvider.RIFT,
		tokenAmount: refs[RIFT_EXTERNAL_REF_KEYS.AMOUNT] ?? '',
		usdSourceValue: refs[RIFT_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE] ?? '',
		sourceNetwork: refs[RIFT_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL] ?? '',
		destinationNetwork: refs[RIFT_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL] ?? ''
	};
};
