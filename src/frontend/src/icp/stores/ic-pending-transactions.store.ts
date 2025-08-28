import type { IcCertifiedTransaction } from '$icp/stores/ic-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { initCertifiedStore, type CertifiedStore } from '$lib/stores/certified.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export type IcCertifiedPendingTransaction = IcCertifiedTransaction;

export type IcPendingTransactionsData = IcCertifiedPendingTransaction[];

export interface IcPendingTransactionsStore extends CertifiedStore<IcPendingTransactionsData> {
	prepend: (params: { tokenId: TokenId; transaction: CertifiedData<IcTransactionUi> }) => void;
	set: (params: { tokenId: TokenId; data: IcPendingTransactionsData }) => void;
}

const initIcPendingTransactionsStore = (): IcPendingTransactionsStore => {
	const { subscribe, update, reset, reinitialize } =
		initCertifiedStore<IcPendingTransactionsData>();

	return {
		prepend: ({
			tokenId,
			transaction
		}: {
			tokenId: TokenId;
			transaction: CertifiedData<IcTransactionUi>;
		}) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					transaction,
					...((state ?? {})[tokenId] ?? []).filter(({ data: { id } }) => transaction.data.id !== id)
				]
			})),
		set: ({ tokenId, data }: { tokenId: TokenId; data: IcPendingTransactionsData }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: data
			})),
		reset,
		reinitialize,
		subscribe
	};
};

export const icPendingTransactionsStore = initIcPendingTransactionsStore();
