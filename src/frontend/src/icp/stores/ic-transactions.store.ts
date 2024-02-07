import type { IcTransactionUi } from '$icp/types/ic';
import { initCertifiedStore, type CertifiedStore } from '$lib/stores/certified.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export type IcCertifiedTransaction = CertifiedData<IcTransactionUi>;

export type IcTransactionsData = IcCertifiedTransaction[];

export interface IcTransactionsStore extends CertifiedStore<IcTransactionsData> {
	prepend: (params: { tokenId: TokenId; transactions: IcCertifiedTransaction[] }) => void;
	append: (params: { tokenId: TokenId; transactions: IcCertifiedTransaction[] }) => void;
	cleanUp: (params: { tokenId: TokenId; transactionIds: string[] }) => void;
}

const initIcTransactionsStore = (): IcTransactionsStore => {
	const { subscribe, update, reset } = initCertifiedStore<IcTransactionsData>();

	return {
		prepend: ({
			tokenId,
			transactions
		}: {
			tokenId: TokenId;
			transactions: IcCertifiedTransaction[];
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
			transactions: IcCertifiedTransaction[];
		}) =>
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
