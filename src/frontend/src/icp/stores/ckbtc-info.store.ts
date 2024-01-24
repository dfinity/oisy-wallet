import { initCertifiedStore, type CertifiedStore } from '$lib/stores/certified.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { MinterInfo } from '@dfinity/ckbtc';
import { nonNullish } from '@dfinity/utils';

export type CkBtcMinterInfoData = CertifiedData<MinterInfo>;

export interface CkBtcMinterInfoStore extends CertifiedStore<CkBtcMinterInfoData> {
	set: (params: { tokenId: TokenId; minterInfo: CkBtcMinterInfoData }) => void;
}

const initCkBtcMinterInfoStore = (): CkBtcMinterInfoStore => {
	const { subscribe, update, reset } = initCertifiedStore<CkBtcMinterInfoData>();

	return {
		set: ({ tokenId, minterInfo }: { tokenId: TokenId; minterInfo: CkBtcMinterInfoData }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: minterInfo
			})),
		reset,
		subscribe
	};
};

export const ckBtcMinterInfoStore = initCkBtcMinterInfoStore();
