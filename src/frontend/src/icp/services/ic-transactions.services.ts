import { getTransactions as getTransactionsIcp } from '$icp/api/icp-index.api';
import { getTransactions as getTransactionsIcrc } from '$icp/api/icrc-index-ng.api';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcCanistersStrict, IcToken } from '$icp/types/ic-token';
import type { IcTransaction, IcTransactionUi } from '$icp/types/ic-transaction';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { mapIcTransaction } from '$icp/utils/ic-transactions.utils';
import { mapTransactionIcpToSelf } from '$icp/utils/icp-transactions.utils';
import { mapTransactionIcrcToSelf } from '$icp/utils/icrc-transactions.utils';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import { isNotIcToken, isNotIcTokenCanistersStrict } from '$icp/validation/ic-token.validation';
import { TRACK_COUNT_IC_LOADING_TRANSACTIONS_ERROR } from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token, TokenId } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { mapIcErrorMetadata } from '$lib/utils/error.utils';
import { findOldestTransaction } from '$lib/utils/transactions.utils';
import type { Principal } from '@dfinity/principal';
import { isNullish, nonNullish, queryAndUpdate } from '@dfinity/utils';
import { get } from 'svelte/store';

const getTransactions = async ({
	token: { standard, indexCanisterId },
	...rest
}: {
	owner: Principal;
	identity: OptionIdentity;
	start?: bigint;
	maxResults?: bigint;
	token: IcToken & IcCanistersStrict;
}): Promise<IcTransaction[]> => {
	if (isTokenIcrc({ standard })) {
		const { transactions } = await getTransactionsIcrc({
			indexCanisterId,
			...rest
		});
		return transactions.flatMap(mapTransactionIcrcToSelf);
	}

	const { transactions } = await getTransactionsIcp({
		indexCanisterId,
		...rest
	});
	return transactions.flatMap(mapTransactionIcpToSelf);
};

const loadNextIcTransactionsRequest = ({
	token,
	identity,
	signalEnd,
	...rest
}: {
	owner: Principal;
	identity: OptionIdentity;
	start?: bigint;
	maxResults?: bigint;
	token: IcToken & IcCanistersStrict;
	signalEnd: () => void;
}): Promise<void> =>
	queryAndUpdate<IcTransaction[]>({
		request: (params) =>
			getTransactions({
				token,
				...rest,
				...params
			}),
		onLoad: ({ response: transactions, certified }) => {
			if (transactions.length === 0) {
				signalEnd();
				return;
			}

			icTransactionsStore.append({
				tokenId: token.id,
				transactions: transactions.map((transaction) => ({
					data: mapIcTransaction({
						transaction,
						token,
						identity
					}),
					certified
				}))
			});
		},
		onUpdateError: ({ error }) => {
			onLoadTransactionsError({ tokenId: token.id, error });

			signalEnd();
		},
		identity
	});

export const onLoadTransactionsError = ({
	tokenId,
	error: err
}: {
	tokenId: TokenId;
	error: unknown;
}) => {
	icTransactionsStore.reset(tokenId);

	// We get transactions and balance for the same end point therefore if getting certified transactions fails, it also means the balance is incorrect.
	balancesStore.reset(tokenId);

	trackEvent({
		name: TRACK_COUNT_IC_LOADING_TRANSACTIONS_ERROR,
		metadata: {
			tokenId: tokenId.description ?? '',
			...(mapIcErrorMetadata(err) ?? {})
		}
	});

	// We print the error to console just for debugging purposes
	console.warn(`${get(i18n).transactions.error.loading_transactions}:`, err);
	return;
};

export const onTransactionsCleanUp = (data: { tokenId: TokenId; transactionIds: string[] }) => {
	icTransactionsStore.cleanUp(data);

	toastsError({
		msg: {
			text: get(i18n).transactions.error.uncertified_transactions_removed
		}
	});
};

export const loadNextIcTransactions = async ({
	lastId,
	token,
	...rest
}: {
	lastId: IcTransactionUi['id'] | undefined;
	owner: Principal;
	identity: OptionIdentity;
	maxResults?: bigint;
	token: Token;
	signalEnd: () => void;
}): Promise<void> => {
	const lastIdCleaned = lastId?.replace('-self', '');

	try {
		if (nonNullish(lastIdCleaned)) {
			BigInt(lastIdCleaned);
		}
	} catch {
		// Pseudo transactions are displayed at the end of the list. There is not such use case in Oisy.
		// Additionally, if it would be the case, that would mean that we display pseudo transactions at the end of the list and therefore we could assume all valid transactions have been fetched
		return;
	}

	if (isNullish(token)) {
		// Prevent unlikely events. UI wise if we are about to load the next transactions, it's probably because transactions for a loaded token have been fetched.
		return;
	}

	if (isNotIcToken(token) || isNotIcTokenCanistersStrict(token)) {
		// On one hand, we assume that the parent component does not mount this component if no transactions can be fetched; on the other hand, we want to avoid displaying an error toast that could potentially appear multiple times.
		// Therefore, we do not particularly display a visual error. In any case, we cannot load transactions without an Index canister.
		return;
	}

	await loadNextIcTransactionsRequest({
		start: nonNullish(lastIdCleaned) ? BigInt(lastIdCleaned) : undefined,
		token,
		...rest
	});
};

export const loadNextIcTransactionsByOldest = async ({
	minTimestamp,
	transactions,
	...rest
}: {
	minTimestamp: number;
	transactions: IcTransactionUi[];
	owner: Principal;
	identity: OptionIdentity;
	maxResults?: bigint;
	token: Token;
	signalEnd: () => void;
}): Promise<ResultSuccess> => {
	// If there are no transactions, we let the worker load the first ones
	if (transactions.length === 0) {
		return { success: false };
	}

	const lastTransaction = findOldestTransaction(transactions);

	const { timestamp: minIcTimestamp, id: lastId } = lastTransaction ?? {};

	if (
		nonNullish(minIcTimestamp) &&
		normalizeTimestampToSeconds(minIcTimestamp) <= normalizeTimestampToSeconds(minTimestamp)
	) {
		return { success: false };
	}

	await loadNextIcTransactions({
		...rest,
		lastId
	});

	return { success: true };
};
