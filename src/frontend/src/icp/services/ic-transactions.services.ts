import { getTransactions as getTransactionsIcp } from '$icp/api/icp-index.api';
import { getTransactions as getTransactionsIcrc } from '$icp/api/icrc-index-ng.api';
import { loadIcrc3BlockLog } from '$icp/services/icrc3.services';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcCanistersStrict, IcToken } from '$icp/types/ic-token';
import type { IcTransaction, IcTransactionUi } from '$icp/types/ic-transaction';
import type { Icrc7Token } from '$icp/types/icrc7-token';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { mapIcTransaction } from '$icp/utils/ic-transactions.utils';
import { mapTransactionIcpToSelf } from '$icp/utils/icp-transactions.utils';
import { mapTransactionIcrcToSelf } from '$icp/utils/icrc-transactions.utils';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import { mapIcrc7BlockToTransactions } from '$icp/utils/icrc7-transactions.utils';
import { isTokenIcrc7 } from '$icp/utils/icrc7.utils';
import { isNotIcToken, isNotIcTokenCanistersStrict } from '$icp/validation/ic-token.validation';
import { TRACK_COUNT_IC_LOADING_TRANSACTIONS_ERROR } from '$lib/constants/analytics.constants';
import { WALLET_PAGINATION, ZERO } from '$lib/constants/app.constants';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTIONS,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { balancesStore } from '$lib/stores/balances.store';
import type { NullishIdentity } from '$lib/types/identity';
import type { Token, TokenId } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { mapIcErrorMetadata } from '$lib/utils/error.utils';
import { findOldestTransaction } from '$lib/utils/transactions.utils';
import { isNullish, nonNullish, queryAndUpdate } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';

const getTransactions = async ({
	token: { standard, indexCanisterId },
	...rest
}: {
	owner: Principal;
	identity: NullishIdentity;
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
	identity: NullishIdentity;
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

const loadIcrc7TransactionsPage = async ({
	token,
	identity,
	certified,
	lastId,
	maxResults
}: {
	token: Icrc7Token;
	identity: NullishIdentity;
	certified?: boolean;
	lastId?: string;
	maxResults?: bigint;
}): Promise<{ transactions: IcTransactionUi[]; reachedStart: boolean }> => {
	const length = maxResults ?? WALLET_PAGINATION;
	let cursorEnd: bigint;

	if (nonNullish(lastId)) {
		cursorEnd = BigInt(lastId);
	} else {
		const { logLength } = await loadIcrc3BlockLog({
			identity,
			canisterId: token.canisterId,
			start: ZERO,
			length: ZERO,
			certified
		});
		cursorEnd = logLength;
	}

	while (cursorEnd > ZERO) {
		const start = cursorEnd > length ? cursorEnd - length : ZERO;
		const { blocks } = await loadIcrc3BlockLog({
			identity,
			canisterId: token.canisterId,
			start,
			length: cursorEnd - start,
			certified
		});

		const transactions = blocks
			.toReversed()
			.flatMap((block) => mapIcrc7BlockToTransactions({ block, identity }));

		if (transactions.length > 0 || start === ZERO) {
			return { transactions, reachedStart: start === ZERO };
		}

		cursorEnd = start;
	}

	return { transactions: [], reachedStart: true };
};

const loadNextIcrc7TransactionsRequest = ({
	token,
	identity,
	signalEnd,
	lastId,
	maxResults
}: {
	identity: NullishIdentity;
	lastId?: string;
	maxResults?: bigint;
	token: Icrc7Token;
	signalEnd: () => void;
}): Promise<void> =>
	queryAndUpdate<{ transactions: IcTransactionUi[]; reachedStart: boolean }>({
		request: ({ certified }) =>
			loadIcrc7TransactionsPage({
				token,
				identity,
				lastId,
				maxResults,
				certified
			}),
		onLoad: ({ response: { transactions, reachedStart }, certified }) => {
			if (transactions.length === 0) {
				if (reachedStart) {
					signalEnd();
				}
				return;
			}

			icTransactionsStore.append({
				tokenId: token.id,
				transactions: transactions.map((transaction) => ({ data: transaction, certified }))
			});

			if (reachedStart) {
				signalEnd();
			}
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
			tokenId: `${tokenId.description}`,
			...(mapIcErrorMetadata(err) ?? {})
		}
	});
};

export const onTransactionsCleanUp = ({
	tokenId,
	transactionIds
}: {
	tokenId: TokenId;
	transactionIds: string[];
}) => {
	icTransactionsStore.cleanUp({ tokenId, transactionIds });

	trackEvent({
		name: PLAUSIBLE_EVENTS.LOAD_TRANSACTIONS,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.TRANSACTIONS,
			event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTIONS.UNCERTIFIED_REMOVED,
			token_id: `${tokenId.description}`,
			removed_count: `${transactionIds.length}`
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
	identity: NullishIdentity;
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

	if (isTokenIcrc7(token)) {
		await loadNextIcrc7TransactionsRequest({
			lastId: lastIdCleaned,
			token,
			...rest
		});
		return;
	}

	if (isNotIcToken(token)) {
		return;
	}

	if (isNotIcTokenCanistersStrict(token)) {
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
	identity: NullishIdentity;
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
