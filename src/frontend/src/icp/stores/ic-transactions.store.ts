import type { IcTransaction } from '$icp/types/ic';
import { initCertifiedStore, type CertifiedStore } from '$lib/stores/certified.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export type IcTransactionsData<T> = CertifiedData<T>[];

export interface IcTransactionsStore<T> extends CertifiedStore<IcTransactionsData<T>> {
	prepend: (params: { tokenId: TokenId; transactions: CertifiedData<T>[] }) => void;
	append: (params: { tokenId: TokenId; transactions: CertifiedData<T>[] }) => void;
	cleanUp: (params: { tokenId: TokenId; transactionIds: string[] }) => void;
}

const initIcTransactionsStore = <T extends IcTransaction>(): IcTransactionsStore<T> => {
	const { subscribe, update, reset } = initCertifiedStore<IcTransactionsData<T>>();

	return {
		prepend: ({ tokenId, transactions }: { tokenId: TokenId; transactions: CertifiedData<T>[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...transactions,
					...((state ?? {})[tokenId] ?? []).filter(
						({ data: { id } }) => !transactions.some(({ data: { id: txId } }) => txId === id)
					)
				]
			})),
		append: ({ tokenId, transactions }: { tokenId: TokenId; transactions: CertifiedData<T>[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [...((state ?? {})[tokenId] ?? []), ...transactions]
			})),
		cleanUp: ({ tokenId, transactionIds }: { tokenId: TokenId; transactionIds: string[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: ((state ?? {})[tokenId] ?? []).filter(
					({ data: { id } }) => !transactionIds.includes(`${id}`)
				)
			})),
		reset,
		subscribe
	};
};

export const icTransactionsStore = initIcTransactionsStore();
