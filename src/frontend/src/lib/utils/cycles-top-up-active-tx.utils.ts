import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionRef,
	ActiveUserTransactionStatus
} from '$declarations/backend/backend.did';
import { CYCLES_LEDGER_DECIMALS } from '$icp/constants/cmc.constants';
import type { CyclesTopUpNotifyResult } from '$icp/types/cycles-top-up';
import { ACTIVE_USER_TRANSACTION_ERROR_MAX_BYTES } from '$lib/constants/app.constants';
import {
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS
} from '$lib/enums/plausible';
import type { TrackCyclesTopUpParams } from '$lib/services/cycles-top-up-analytics.services';
import {
	CYCLES_TOP_UP_EXTERNAL_REF_KEYS,
	type CyclesTopUpExternalRefKey,
	type CyclesTopUpOutcome
} from '$lib/types/cycles-top-up-active-tx';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { truncateUtf8Bytes } from '$lib/utils/string.utils';
import { toBackendTokenId } from '$lib/utils/token-id.utils';
import { nonNullish } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';

export const isCyclesTopUpActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	'CyclesTopUp' in tx.data;

/**
 * Builds the `CyclesTopUp` AUT data variant: everything fixed when the row opens, which
 * includes the canister, because the ICP ledger keeps only a hash of its deposit account,
 * and the transfer's `created_at_time`, because the row opens before the transfer.
 *
 * Returns `undefined` when the token has no backend `TokenId`, which the flow treats as
 * "cannot be tracked, so do not start".
 */
export const toCyclesTopUpData = ({
	sourceToken,
	canisterId,
	amount,
	transferCreatedAtNs
}: {
	sourceToken: Token;
	canisterId: Principal;
	amount: bigint;
	transferCreatedAtNs: bigint;
}): ActiveUserTransactionData | undefined => {
	const source_token = toBackendTokenId(sourceToken);

	if (nonNullish(source_token)) {
		return {
			CyclesTopUp: {
				source_token,
				canister_id: canisterId,
				amount,
				transfer_created_at_ns: transferCreatedAtNs
			}
		};
	}
};

// A deterministic `(key, value)` array without empties, like `toCyclesMintExternalRefs`.
export const toCyclesTopUpExternalRefs = (
	refs: Partial<Record<CyclesTopUpExternalRefKey, string>>
): ActiveUserTransactionRef[] =>
	(Object.keys(refs) as CyclesTopUpExternalRefKey[])
		.filter((key) => refs[key] !== undefined && refs[key] !== '')
		.sort()
		.map((key) => ({ key, value: refs[key] as string }));

export const toCyclesTopUpExternalRefsMap = (
	refs: ActiveUserTransactionRef[]
): Partial<Record<CyclesTopUpExternalRefKey, string>> => {
	const map: Partial<Record<CyclesTopUpExternalRefKey, string>> = {};

	for (const { key, value } of refs) {
		map[key as CyclesTopUpExternalRefKey] = value;
	}

	return map;
};

/**
 * The fields the Active transactions row renders and the terminal analytics read, under the
 * swap providers' key names.
 */
export const toCyclesTopUpDisplayRefs = ({
	sourceToken,
	amount,
	usdSourceValue
}: {
	sourceToken: Token;
	amount: string;
	usdSourceValue?: string;
}): Partial<Record<CyclesTopUpExternalRefKey, string>> => ({
	[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.AMOUNT]: amount,
	...(nonNullish(usdSourceValue) && {
		[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE]: usdSourceValue
	}),
	[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: sourceToken.symbol,
	[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: sourceToken.network.name
});

export const toCyclesTopUpOutcome = (value: string | undefined): CyclesTopUpOutcome | undefined =>
	value === 'topped_up' || value === 'refunded' || value === 'failed' || value === 'not_sent'
		? value
		: undefined;

// The backend refuses an `error` longer than its byte limit, and a refused terminal write would
// leave the row notifying the same final answer forever. The CMC's reasons are its own free
// text, so they are cut to fit rather than trusted to.
const toCyclesTopUpRowError = (reason: string): string =>
	truncateUtf8Bytes({ text: reason, maxBytes: ACTIVE_USER_TRANSACTION_ERROR_MAX_BYTES });

/**
 * What a notify outcome means for the row, shared by the modal and the poller so the two
 * cannot disagree. `undefined` for `pending`: the row stays as it is and is notified again.
 */
export const toCyclesTopUpRowUpdate = (
	result: CyclesTopUpNotifyResult
):
	| {
			status: ActiveUserTransactionStatus;
			error?: string;
			learned: Partial<Record<CyclesTopUpExternalRefKey, string>>;
	  }
	| undefined => {
	if (result.status === 'pending') {
		return undefined;
	}

	if (result.status === 'topped_up') {
		return {
			status: { Succeeded: null },
			learned: {
				[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.OUTCOME]: 'topped_up',
				[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.CYCLES]: formatToken({
					value: result.cycles,
					unitName: CYCLES_LEDGER_DECIMALS,
					displayDecimals: CYCLES_LEDGER_DECIMALS
				})
			}
		};
	}

	return {
		status: { Failed: null },
		error: toCyclesTopUpRowError(result.reason),
		learned: {
			[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.OUTCOME]: result.status,
			...(result.status === 'refunded' &&
				nonNullish(result.refundBlockIndex) && {
					[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.REFUND_BLOCK_INDEX]: `${result.refundBlockIndex}`
				})
		}
	};
};

/**
 * The terminal analytics of a top-up row, read entirely off the row so they survive a
 * refresh or a later session. Never the row's `error`, the CMC's own reason text, nor its
 * amounts, for the reason `TrackCyclesTopUpParams` gives. Only the navigation pays with ICP,
 * so it is the source of every row.
 */
export const toCyclesTopUpTrackingParams = ({
	tx
}: {
	tx: ActiveUserTransaction;
}): TrackCyclesTopUpParams => {
	const refs = toCyclesTopUpExternalRefsMap(tx.external_refs);
	const outcome = toCyclesTopUpOutcome(refs[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.OUTCOME]);
	const isSucceeded = 'Succeeded' in tx.status;

	return {
		step: 'top_up',
		resultStatus: isSucceeded
			? PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
		tokenSymbol: refs[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL],
		sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.NAVIGATION,
		...(!isSucceeded && {
			errorCode: outcome === 'refunded' || outcome === 'not_sent' ? outcome : 'failed'
		})
	};
};
