import type { BtcTransactionUi } from '$btc/types/btc';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { initCertifiedStore, type CertifiedStore } from '$lib/stores/certified.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { nonNullish } from '@dfinity/utils';

export type CertifiedTransaction<T> = CertifiedData<T>;

export type NullableCertifiedTransactions = null;

export type TransactionsData<T> = CertifiedTransaction<T>[] | NullableCertifiedTransactions;

export interface TransactionsStore<T> extends CertifiedStore<TransactionsData<T>> {
	prepend: (params: { tokenId: TokenId; transactions: CertifiedTransaction<T>[] }) => void;
	append: (params: { tokenId: TokenId; transactions: CertifiedTransaction<T>[] }) => void;
	cleanUp: (params: { tokenId: TokenId; transactionIds: string[] }) => void;
	nullify: (tokenId: TokenId) => void;
}

export const initTransactionsStore = <
	T extends IcTransactionUi | BtcTransactionUi | SolTransactionUi
>(): TransactionsStore<T> => {
	const { subscribe, update, reset } = initCertifiedStore<TransactionsData<T>>();

	return {
		prepend: ({
			tokenId,
			transactions
		}: {
			tokenId: TokenId;
			transactions: CertifiedTransaction<T>[];
		}) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...transactions,
					...((state ?? {})[tokenId] ?? []).filter(
						({ data: { id } }) => !transactions.some(({ data: { id: txId } }) => txId === id)
					)
				]
			})),
		append: ({
			tokenId,
			transactions
		}: {
			tokenId: TokenId;
			transactions: CertifiedTransaction<T>[];
		}) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...((state ?? {})[tokenId] ?? []),
					...transactions.filter(
						({ data: { id } }) =>
							!((state ?? {})[tokenId] ?? []).some(({ data: { id: txId } }) => txId === id)
					)
				]
			})),
		cleanUp: ({ tokenId, transactionIds }: { tokenId: TokenId; transactionIds: string[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: ((state ?? {})[tokenId] ?? []).filter(
					({ data: { id } }) => !transactionIds.includes(`${id}`)
				)
			})),
		nullify: (tokenId) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: null
			})),
		reset,
		subscribe
	};
};
