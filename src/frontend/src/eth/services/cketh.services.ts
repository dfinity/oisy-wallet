import { ckEthHelperContractAddress } from '$eth/api/cketh-minter.api';
import { ckEthHelperContractAddressStore } from '$eth/stores/cketh.store';
import { CKETH_MINTER_CANISTER_ID } from '$icp/constants/icrc.constants';
import { queryAndUpdate } from '$lib/actors/query.ic';
import type { ETH_ADDRESS } from '$lib/types/address';
import { AnonymousIdentity } from '@dfinity/agent';
import { get } from 'svelte/store';

export const loadCkEthHelperContractAddress = async () => {
	const addressInStore = get(ckEthHelperContractAddressStore);

	// We try to load only once per session the help contract address
	if (addressInStore !== undefined) {
		return;
	}

	await queryAndUpdate<ETH_ADDRESS>({
		request: ({ identity: _, certified }) =>
			ckEthHelperContractAddress({
				minterCanisterId: CKETH_MINTER_CANISTER_ID,
				identity: new AnonymousIdentity(),
				certified
			}),
		onLoad: ({ response: data, certified }) =>
			ckEthHelperContractAddressStore.set({ data, certified }),
		onCertifiedError: ({ error }) => {
			// We silence the error here because we display a visual error when we try to effectively use the information
			console.error(error);

			ckEthHelperContractAddressStore.reset();
		},
		identity: new AnonymousIdentity()
	});
};
