import type { UtxoTxidText } from '$icp/types/ckbtc';
import {
	initCertifiedSetterStore,
	type CertifiedSetterStoreStore
} from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { PendingUtxo } from '@dfinity/ckbtc';
import { nonNullish, uint8ArrayToHexString } from '@dfinity/utils';

export type CkBtcPendingUtxosData = CertifiedData<PendingUtxo[]>;

interface CkBtcPendingUtxosStore extends CertifiedSetterStoreStore<CkBtcPendingUtxosData> {
	filter: (params: { tokenId: TokenId; utxosIds: CertifiedData<UtxoTxidText[]> }) => void;
}

const initCkBtcPendingUtxosStore = (): CkBtcPendingUtxosStore => {
	const { subscribe, set, reset, reinitialize, update } =
		initCertifiedSetterStore<CkBtcPendingUtxosData>();

	return {
		filter: ({
			tokenId,
			utxosIds
		}: {
			tokenId: TokenId;
			utxosIds: CertifiedData<UtxoTxidText[]>;
		}) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: {
					data: (state?.[tokenId]?.data ?? []).filter(
						({ outpoint: { txid: pendingTxid } }) =>
							!utxosIds.data.includes(uint8ArrayToHexString(pendingTxid))
					),
					certified: state?.[tokenId]?.certified ?? false
				}
			})),
		set,
		reset,
		reinitialize,
		subscribe
	};
};

export const ckBtcPendingUtxosStore = initCkBtcPendingUtxosStore();
