import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';

export type CkEthHelperContractAddressData = CertifiedData<ETH_ADDRESS>;

export const ckEthHelperContractAddressStore =
	initCertifiedSetterStore<CkEthHelperContractAddressData>();
