import type { BtcTransactionUi } from '$btc/types/btc';
import { initCertifiedStore, type CertifiedStore } from '$lib/stores/certified.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export type BtcCertifiedTransaction = CertifiedData<BtcTransactionUi>;

export type BtcTransactionsData = BtcCertifiedTransaction[];

export interface BtcTransactionsStore extends CertifiedStore<BtcTransactionsData> {
	prepend: (params: { tokenId: TokenId; transactions: BtcCertifiedTransaction[] }) => void;
}

const initBtcTransactionsStore = (): BtcTransactionsStore => {
	const { subscribe, update, reset } = initCertifiedStore<BtcTransactionsData>();

	return {
		prepend: ({
			tokenId,
			transactions
		}: {
			tokenId: TokenId;
			transactions: BtcCertifiedTransaction[];
		}) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...transactions,
					...((state ?? {})[tokenId] ?? []).filter(
						({ data: { hash } }) =>
							!transactions.some(({ data: { hash: txHash } }) => txHash === hash)
					)
				]
			})),
		reset,
		subscribe
	};
};

export const btcTransactionsStore = initBtcTransactionsStore();
