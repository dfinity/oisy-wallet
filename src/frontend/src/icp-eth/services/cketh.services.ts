import { minterInfo } from '$icp-eth/api/cketh-minter.api';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import type { IcCkMetadata } from '$icp/types/ic';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { DEFAULT_NETWORK } from '$lib/constants/networks.constants';
import { toastsError } from '$lib/stores/toasts.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { Network } from '$lib/types/network';
import type { TokenId, TokenStandard } from '$lib/types/token';
import { isNetworkICP } from '$lib/utils/network.utils';
import { AnonymousIdentity } from '@dfinity/agent';
import type { MinterInfo } from '@dfinity/cketh';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadCkEthMinterInfo = async ({
	tokenId,
	canisters: { minterCanisterId }
}: {
	tokenId: TokenId;
	canisters: IcCkMetadata;
}) => {
	const minterInfoInStore = get(ckEthMinterInfoStore);

	// We try to load only once per session the helpers (ckETH and ckErc20) contract addresses
	if (minterInfoInStore?.[tokenId] !== undefined) {
		return;
	}

	await queryAndUpdate<MinterInfo>({
		request: ({ identity: _, certified }) =>
			minterInfo({
				minterCanisterId,
				identity: new AnonymousIdentity(),
				certified
			}),
		onLoad: ({ response: data, certified }) =>
			ckEthMinterInfoStore.set({ tokenId, data: { data, certified } }),
		onCertifiedError: ({ error }) => {
			// We silence the error here because we display a visual error when we try to effectively use the information
			console.error(error);

			ckEthMinterInfoStore.reset(tokenId);
		},
		identity: new AnonymousIdentity()
	});
};

export const assertCkEthHelperContractAddressLoaded = ({
	helperContractAddress,
	tokenStandard,
	network,
	helperContractAddressCertified
}: {
	helperContractAddress: ETH_ADDRESS | null | undefined;
	helperContractAddressCertified: boolean | undefined;
	tokenStandard: TokenStandard;
	network: Network | undefined;
}): { valid: boolean } => {
	if (tokenStandard !== 'ethereum' || !isNetworkICP(network ?? DEFAULT_NETWORK)) {
		return { valid: true };
	}

	// TODO: extract i18n

	if (isNullish(helperContractAddress)) {
		toastsError({
			msg: {
				text: `Try again in few seconds, a ckETH configuration parameter is not yet loaded.`
			}
		});
		return { valid: false };
	}

	if (helperContractAddressCertified !== true) {
		toastsError({
			msg: {
				text: `Try again in few seconds, a ckETH configuration parameter has not yet certified.`
			}
		});
		return { valid: false };
	}

	return { valid: true };
};
