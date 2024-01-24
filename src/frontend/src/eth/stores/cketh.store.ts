import { initCertifiedStore, type CertifiedStore } from '$lib/stores/certified.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export type CkEthHelperContractAddressData = CertifiedData<ETH_ADDRESS>;

export interface CkEthHelperContractAddressStore
	extends CertifiedStore<CkEthHelperContractAddressData> {
	set: (params: { tokenId: TokenId; address: CkEthHelperContractAddressData }) => void;
}

const initCkEthHelperContractAddressStore = (): CkEthHelperContractAddressStore => {
	const { subscribe, update, reset } = initCertifiedStore<CkEthHelperContractAddressData>();

	return {
		set: ({ tokenId, address }: { tokenId: TokenId; address: CkEthHelperContractAddressData }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: address
			})),
		reset,
		subscribe
	};
};

export const ckEthHelperContractAddressStore = initCkEthHelperContractAddressStore();
