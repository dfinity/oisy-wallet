import { getIdbSolTransactions } from '$lib/api/idb-transactions.api';
import { syncWalletFromIdbCache } from '$lib/services/listener.services';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { GetIdbTransactionsParams } from '$lib/types/idb-transactions';
import type { TokenId } from '$lib/types/token';
import { consoleWarn } from '$lib/utils/console.utils';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import type {
	SolPostMessageDataResponseWallet,
	SolWalletRouting
} from '$sol/types/sol-post-message';
import type { SolResolvedTransaction, SolTransactionUi } from '$sol/types/sol-transaction';
import { isNullish, jsonReviver, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Removes the rows a token holds for the signatures of `transactions` under another id. A record
 * derived under its signature id supersedes the per-instruction rows of the older shape: same
 * transaction, different ids. Call it before writing `transactions` to the token.
 */
export const cleanUpStaleSolTransactions = ({
	tokenId,
	transactions
}: {
	tokenId: TokenId;
	transactions: SolTransactionUi[];
}) => {
	const incomingSignatures = new Set(transactions.map(({ signature }) => String(signature)));
	const incomingIds = new Set(transactions.map(({ id }) => `${id}`));

	const staleIds = (get(solTransactionsStore)?.[tokenId] ?? [])
		.filter(
			({ data }) => incomingSignatures.has(String(data.signature)) && !incomingIds.has(`${data.id}`)
		)
		.map(({ data: { id } }) => `${id}`);

	if (staleIds.length > 0) {
		solTransactionsStore.cleanUp({ tokenId, transactionIds: staleIds });
	}
};

const syncTokenTransactions = ({
	tokenId,
	transactions
}: {
	tokenId: TokenId;
	transactions: SolCertifiedTransaction[];
}) => {
	cleanUpStaleSolTransactions({ tokenId, transactions: transactions.map(({ data }) => data) });

	solTransactionsStore.prepend({
		tokenId,
		transactions
	});
};

/**
 * Writes one tick of a Solana network worker into the per-token stores: each balance to its token,
 * and each record to every token whose source returned its signature (the wallet to native SOL, an
 * associated token account to the token of its mint). A source the routing does not know, left from
 * a token list the worker has since been restarted without, is dropped.
 */
export const syncWallet = ({
	data,
	routing: { nativeTokenId, splTokenIds, sourceTokens }
}: {
	data: SolPostMessageDataResponseWallet;
	routing: SolWalletRouting;
}) => {
	const {
		wallet: {
			balances: { sol, spl },
			newTransactions
		}
	} = data;

	balancesStore.batchSet({ id: nativeTokenId, data: { data: sol, certified: false } });

	Object.entries(spl).forEach(([mint, balance]) => {
		const tokenId = splTokenIds.get(mint);

		// A balance the worker could not read is absent: the token keeps the balance it last had.
		if (nonNullish(tokenId) && nonNullish(balance)) {
			balancesStore.batchSet({ id: tokenId, data: { data: balance, certified: false } });
		}
	});

	const resolved: SolResolvedTransaction[] = JSON.parse(newTransactions, jsonReviver);

	const tokenIdOfSource = (source: SolResolvedTransaction['sources'][number]) => {
		const mint = sourceTokens.get(source);

		if (mint === undefined) {
			return;
		}

		return isNullish(mint) ? nativeTokenId : splTokenIds.get(mint);
	};

	const transactionsByToken = resolved.reduce((acc, { transaction, sources }) => {
		new Set(sources.map(tokenIdOfSource).filter(nonNullish)).forEach((tokenId) =>
			acc.set(tokenId, [...(acc.get(tokenId) ?? []), { data: transaction, certified: false }])
		);

		return acc;
	}, new Map<TokenId, SolCertifiedTransaction[]>());

	// Every token of the network gets its list, even an empty one: a token without an entry in the
	// store is still loading, and would stay so.
	[nativeTokenId, ...splTokenIds.values()].forEach((tokenId) =>
		syncTokenTransactions({ tokenId, transactions: transactionsByToken.get(tokenId) ?? [] })
	);
};

export const syncWalletError = ({
	tokenId,
	error: err,
	hideToast = false
}: {
	tokenId: TokenId;
	error: unknown;
	hideToast?: boolean;
}) => {
	const errorText = get(i18n).init.error.sol_wallet_error;

	balancesStore.reset(tokenId);
	solTransactionsStore.reset(tokenId);

	if (hideToast) {
		consoleWarn(`${errorText}:`, err);
		return;
	}

	toastsError({
		msg: { text: errorText },
		err
	});
};

// A record without a summary was not derived from chain data: earlier versions cached the backend
// copy, which cannot carry what a row is shown from. It is left out, and the next load that reaches
// its signature derives it again.
const getIdbDerivedSolTransactions = async (params: GetIdbTransactionsParams) =>
	(await getIdbSolTransactions(params))?.filter(({ summary }) => nonNullish(summary));

export const syncWalletFromCache = (params: Omit<GetIdbTransactionsParams, 'principal'>) =>
	syncWalletFromIdbCache({
		...params,
		getIdbTransactions: getIdbDerivedSolTransactions,
		transactionsStore: solTransactionsStore
	});
