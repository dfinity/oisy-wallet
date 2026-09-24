import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionRef,
	ActiveUserTransactionStatus,
	CyclesMintData
} from '$declarations/backend/backend.did';
import {
	CMC_MINT_CYCLES_MEMO,
	CYCLES_LEDGER_DECIMALS,
	CYCLES_LEDGER_DEPOSIT_FEE
} from '$icp/constants/cmc.constants';
import type { CyclesMintNotifyResult } from '$icp/types/cycles-mint';
import { ZERO } from '$lib/constants/app.constants';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import type { TrackCyclesMintParams } from '$lib/services/cycles-mint-analytics.services';
import {
	CYCLES_MINT_EXTERNAL_REF_KEYS,
	type CyclesMintExternalRefKey,
	type CyclesMintOutcome
} from '$lib/types/cycles-mint-active-tx';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { toBackendTokenId } from '$lib/utils/token-id.utils';
import { fromNullable, nonNullish } from '@dfinity/utils';
import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

export const isCyclesMintActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	'CyclesMint' in tx.data;

/**
 * Builds the `CyclesMint` AUT data variant: everything fixed when the row opens, which
 * includes the transfer's `created_at_time`, because the row opens before the transfer.
 *
 * Returns `undefined` when either token has no backend `TokenId`, which the flow treats
 * as "cannot be tracked, so do not start".
 */
export const toCyclesMintData = ({
	sourceToken,
	destinationToken,
	amount,
	transferCreatedAtNs
}: {
	sourceToken: Token;
	destinationToken: Token;
	amount: bigint;
	transferCreatedAtNs: bigint;
}): ActiveUserTransactionData | undefined => {
	const source_token = toBackendTokenId(sourceToken);
	const dest_token = toBackendTokenId(destinationToken);

	if (nonNullish(source_token) && nonNullish(dest_token)) {
		return {
			CyclesMint: {
				source_token,
				dest_token,
				amount,
				transfer_created_at_ns: transferCreatedAtNs
			}
		};
	}
};

// A deterministic `(key, value)` array without empties, like `toChainFusionExternalRefs`.
export const toCyclesMintExternalRefs = (
	refs: Partial<Record<CyclesMintExternalRefKey, string>>
): ActiveUserTransactionRef[] =>
	(Object.keys(refs) as CyclesMintExternalRefKey[])
		.filter((key) => refs[key] !== undefined && refs[key] !== '')
		.sort()
		.map((key) => ({ key, value: refs[key] as string }));

export const toCyclesMintExternalRefsMap = (
	refs: ActiveUserTransactionRef[]
): Partial<Record<CyclesMintExternalRefKey, string>> => {
	const map: Partial<Record<CyclesMintExternalRefKey, string>> = {};

	for (const { key, value } of refs) {
		map[key as CyclesMintExternalRefKey] = value;
	}

	return map;
};

/**
 * The fields the Active transactions row renders and the terminal analytics read, under
 * the swap providers' key names, so the row renders a mint with the swap layout.
 */
export const toCyclesMintDisplayRefs = ({
	sourceToken,
	destinationToken,
	amount,
	usdSourceValue
}: {
	sourceToken: Token;
	destinationToken: Token;
	amount: string;
	usdSourceValue?: string;
}): Partial<Record<CyclesMintExternalRefKey, string>> => ({
	[CYCLES_MINT_EXTERNAL_REF_KEYS.AMOUNT]: amount,
	...(nonNullish(usdSourceValue) && {
		[CYCLES_MINT_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE]: usdSourceValue
	}),
	[CYCLES_MINT_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: sourceToken.symbol,
	[CYCLES_MINT_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: sourceToken.network.name,
	[CYCLES_MINT_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: destinationToken.symbol,
	[CYCLES_MINT_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: destinationToken.network.name
});

// A block index written by this flow, or `undefined` for anything else: a ref that does
// not parse must read as "no deposit known", never as block 0.
export const toCyclesMintRefBlockIndex = (value: string | undefined): bigint | undefined => {
	if (!/^\d+$/.test(value ?? '')) {
		return undefined;
	}

	return BigInt(value as string);
};

export const toCyclesMintOutcome = (value: string | undefined): CyclesMintOutcome | undefined =>
	value === 'minted' || value === 'refunded' || value === 'failed' || value === 'not_sent'
		? value
		: undefined;

const isCyclesMintMemo = (memo: Uint8Array | undefined): boolean =>
	nonNullish(memo) &&
	memo.length === CMC_MINT_CYCLES_MEMO.length &&
	memo.every((byte, index) => byte === CMC_MINT_CYCLES_MEMO[index]);

/**
 * Whether an ICP history entry is this row's deposit: a transfer of the row's amount to
 * the CMC deposit account, with the `MINT` memo and the row's own `created_at_time`. The
 * timestamp is what makes it this row's deposit rather than another mint of the same
 * amount.
 */
export const isCyclesMintDeposit = ({
	transaction: { operation, icrc1_memo, created_at_time },
	depositAccountIdentifier,
	data: { amount, transfer_created_at_ns }
}: {
	transaction: IcpIndexDid.Transaction;
	depositAccountIdentifier: string;
	data: CyclesMintData;
}): boolean => {
	if (!('Transfer' in operation)) {
		return false;
	}

	const { to, amount: transferred } = operation.Transfer;

	return (
		to.toLowerCase() === depositAccountIdentifier.toLowerCase() &&
		transferred.e8s === amount &&
		fromNullable(created_at_time)?.timestamp_nanos === transfer_created_at_ns &&
		isCyclesMintMemo(fromNullable(icrc1_memo))
	);
};

// What the cycles ledger credits for a mint the CMC reports as `minted`.
export const toCyclesMintCredited = (minted: bigint): bigint =>
	minted > CYCLES_LEDGER_DEPOSIT_FEE ? minted - CYCLES_LEDGER_DEPOSIT_FEE : ZERO;

// The backend refuses an `error` longer than 512 bytes, and a refused terminal write would
// leave the row notifying the same final answer forever. The CMC's reasons are its own
// free text, so they are cut to fit rather than trusted to.
const MAX_ROW_ERROR_BYTES = 512;

const toCyclesMintRowError = (reason: string): string => {
	const encoder = new TextEncoder();

	let error = reason;

	while (encoder.encode(error).length > MAX_ROW_ERROR_BYTES) {
		error = error.slice(0, -1);
	}

	return error;
};

/**
 * What a notify outcome means for the row, shared by the modal and the poller so the two
 * cannot disagree. `undefined` for `pending`: the row stays as it is and is notified again.
 */
export const toCyclesMintRowUpdate = (
	result: CyclesMintNotifyResult
):
	| {
			status: ActiveUserTransactionStatus;
			error?: string;
			learned: Partial<Record<CyclesMintExternalRefKey, string>>;
	  }
	| undefined => {
	if (result.status === 'pending') {
		return undefined;
	}

	if (result.status === 'minted') {
		return {
			status: { Succeeded: null },
			learned: {
				[CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: 'minted',
				[CYCLES_MINT_EXTERNAL_REF_KEYS.CREDITED_AMOUNT]: formatToken({
					value: toCyclesMintCredited(result.minted),
					unitName: CYCLES_LEDGER_DECIMALS,
					displayDecimals: CYCLES_LEDGER_DECIMALS
				})
			}
		};
	}

	return {
		status: { Failed: null },
		error: toCyclesMintRowError(result.reason),
		learned: {
			[CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: result.status,
			...(result.status === 'refunded' &&
				nonNullish(result.refundBlockIndex) && {
					[CYCLES_MINT_EXTERNAL_REF_KEYS.REFUND_BLOCK_INDEX]: `${result.refundBlockIndex}`
				})
		}
	};
};

/**
 * The terminal analytics of a mint row, read entirely off the row so they survive a
 * refresh or a later session. Never the row's `error`: that is the CMC's own reason
 * text, which can name the caller's account.
 */
export const toCyclesMintTrackingParams = ({
	tx
}: {
	tx: ActiveUserTransaction;
}): TrackCyclesMintParams => {
	const refs = toCyclesMintExternalRefsMap(tx.external_refs);
	const outcome = toCyclesMintOutcome(refs[CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]);
	const isSucceeded = 'Succeeded' in tx.status;

	return {
		step: 'mint',
		resultStatus: isSucceeded
			? PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
		sourceSymbol: refs[CYCLES_MINT_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL],
		sourceAmount: refs[CYCLES_MINT_EXTERNAL_REF_KEYS.AMOUNT],
		sourceUsdValue: refs[CYCLES_MINT_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE],
		destinationSymbol: refs[CYCLES_MINT_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL],
		...(isSucceeded
			? { destinationAmount: refs[CYCLES_MINT_EXTERNAL_REF_KEYS.CREDITED_AMOUNT] }
			: { errorCode: outcome === 'refunded' || outcome === 'not_sent' ? outcome : 'failed' })
	};
};
