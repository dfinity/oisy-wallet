import type { CertifiedData } from '$lib/types/store';
import type { MinterInfo } from '@dfinity/ckbtc';
import { writable, type Readable } from 'svelte/store';

export type CkBtcMinterInfoData = CertifiedData<MinterInfo> | undefined | null;

export interface CkBtcMinterInfoStore extends Readable<CkBtcMinterInfoData> {
	set: (data: CkBtcMinterInfoData) => void;
	reset: () => void;
}

const initCkBtcMinterInfoStore = (): CkBtcMinterInfoStore => {
	const { subscribe, set } = writable<CkBtcMinterInfoData>(undefined);

	return {
		set: (data: CkBtcMinterInfoData) => set(data),
		reset: () => set(null),
		subscribe
	};
};
export const ckBtcMinterInfoStore = initCkBtcMinterInfoStore();
