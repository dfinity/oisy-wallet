import type { ETH_ADDRESS } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';
import { writable, type Readable } from 'svelte/store';

export type CkEthHelperContractAddressData = CertifiedData<ETH_ADDRESS> | undefined | null;

export interface CkEthHelperContractAddressStore extends Readable<CkEthHelperContractAddressData> {
	set: (data: CkEthHelperContractAddressData) => void;
	reset: () => void;
}

const initCkEthHelperContractAddressStore = (): CkEthHelperContractAddressStore => {
	const { subscribe, set } = writable<CkEthHelperContractAddressData>(undefined);

	return {
		set: (data: CkEthHelperContractAddressData) => set(data),
		reset: () => set(null),
		subscribe
	};
};
export const ckEthHelperContractAddressStore = initCkEthHelperContractAddressStore();
