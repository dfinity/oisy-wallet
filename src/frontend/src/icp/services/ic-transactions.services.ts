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
import {
	isNullish,
	nonNullish,
	queryAndUpdate,
	type QueryAndUpdateOnResponse,
	type QueryAndUpdateRequest
} from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

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

/**
 * Requests one page of older history through `queryAndUpdate` and reports whether it failed.
 *
 * A failure is not the end of the history, so it never signals the end: that would retire the token
 * from the lists for as long as they stay mounted. Only a page that produced nothing by the time the
 * call returns counts as failed. The query usually settles first, so an update call failing after
 * the query already loaded the page is only tracked. Whether the Index canister is down is for the
 * wallet's regular check to decide, not for paging.
 */
const loadNextPageRequest = async <R>({
	tokenId,
	identity,
	request,
	onLoad
}: {
	tokenId: TokenId;
	identity: NullishIdentity;
	request: QueryAndUpdateRequest<R>;
	onLoad: QueryAndUpdateOnResponse<R>;
}): Promise<ResultSuccess> => {
	let loaded = false;
	let err: unknown;

	await queryAndUpdate<R>({
		request,
		onLoad: (params) => {
			loaded = true;

			onLoad(params);
		},
		onQueryError: ({ error }) => {
			err = error;
		},
		onUpdateError: ({ error }) => {
			err = error;

			trackLoadTransactionsError({ tokenId, error });
		},
		identity
	});

	return loaded || isNullish(err) ? { success: true } : { success: false, err };
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
}): Promise<ResultSuccess> =>
	loadNextPageRequest<IcTransaction[]>({
		tokenId: token.id,
		identity,
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
		}
	});

interface Icrc7TransactionsPage {
	transactions: IcTransactionUi[];
	reachedStart: boolean;
}

const loadPreviousIcrc7TransactionsWithMatches = async ({
	token,
	identity,
	certified,
	cursorEnd,
	length
}: {
	token: Icrc7Token;
	identity: NullishIdentity;
	certified?: boolean;
	cursorEnd: bigint;
	length: bigint;
}): Promise<Icrc7TransactionsPage> => {
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
}): Promise<Icrc7TransactionsPage> => {
	const length = maxResults ?? WALLET_PAGINATION;
	const cursorEnd = nonNullish(lastId)
		? BigInt(lastId)
		: (
				await loadIcrc3BlockLog({
					identity,
					canisterId: token.canisterId,
					start: ZERO,
					length: ZERO,
					certified
				})
			).logLength;

	return loadPreviousIcrc7TransactionsWithMatches({
		token,
		identity,
		certified,
		cursorEnd,
		length
	});
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
}): Promise<ResultSuccess> =>
	loadNextPageRequest<Icrc7TransactionsPage>({
		tokenId: token.id,
		identity,
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
		}
	});

export const onLoadTransactionsError = ({
	tokenId,
	error: err
}: {
	tokenId: TokenId;
	error: unknown;
}) => {
	// A sync failure invalidates the balance, not the history: the transactions already loaded —
	// including those restored from the IndexedDB cache — stay displayed until a later sync updates
	// them.
	balancesStore.reset(tokenId);

	trackLoadTransactionsError({ tokenId, error: err });
};

const trackLoadTransactionsError = ({
	tokenId,
	error: err
}: {
	tokenId: TokenId;
	error: unknown;
}) => {
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
}): Promise<ResultSuccess> => {
	const lastIdCleaned = lastId?.replace('-self', '');

	try {
		if (nonNullish(lastIdCleaned)) {
			BigInt(lastIdCleaned);
		}
	} catch {
		// Pseudo transactions are displayed at the end of the list. There is not such use case in Oisy.
		// Additionally, if it would be the case, that would mean that we display pseudo transactions at the end of the list and therefore we could assume all valid transactions have been fetched
		return { success: false };
	}

	if (isNullish(token)) {
		// Prevent unlikely events. UI wise if we are about to load the next transactions, it's probably because transactions for a loaded token have been fetched.
		return { success: false };
	}

	if (isTokenIcrc7(token)) {
		return await loadNextIcrc7TransactionsRequest({
			lastId: lastIdCleaned,
			token,
			...rest
		});
	}

	if (isNotIcToken(token)) {
		return { success: false };
	}

	if (isNotIcTokenCanistersStrict(token)) {
		// On one hand, we assume that the parent component does not mount this component if no transactions can be fetched; on the other hand, we want to avoid displaying an error toast that could potentially appear multiple times.
		// Therefore, we do not particularly display a visual error. In any case, we cannot load transactions without an Index canister.
		return { success: false };
	}

	return await loadNextIcTransactionsRequest({
		start: nonNullish(lastIdCleaned) ? BigInt(lastIdCleaned) : undefined,
		token,
		...rest
	});
};

export const loadNextIcTransactionsByOldest = async ({
	minTimestamp,
	...rest
}: {
	minTimestamp?: number;
	owner: Principal;
	identity: NullishIdentity;
	maxResults?: bigint;
	token: Token;
	signalEnd: () => void;
}): Promise<ResultSuccess> => {
	// Read at call time rather than taken as a parameter: callers page in a loop, and each round has
	// to see what the previous one appended. A list handed in would be a snapshot from before the
	// first await.
	const transactions = (get(icTransactionsStore)?.[rest.token.id] ?? []).map(({ data }) => data);

	// If there are no transactions, we let the worker load the first ones
	if (transactions.length === 0) {
		return { success: false };
	}

	const lastTransaction = findOldestTransaction(transactions);

	const { timestamp: minIcTimestamp, id: lastId } = lastTransaction ?? {};

	// Without a floor the caller wants one page regardless, which is how the floor gets deeper.
	if (
		nonNullish(minTimestamp) &&
		nonNullish(minIcTimestamp) &&
		normalizeTimestampToSeconds(minIcTimestamp) <= normalizeTimestampToSeconds(minTimestamp)
	) {
		return { success: false };
	}

	const { err } = await loadNextIcTransactions({
		...rest,
		lastId
	});

	// Passed up rather than read as the end, so the lists keep the token and ask again later.
	if (nonNullish(err)) {
		return { success: false, err };
	}

	return { success: true };
};
