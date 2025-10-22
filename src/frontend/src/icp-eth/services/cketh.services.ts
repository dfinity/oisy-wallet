import { minterInfo } from '$icp-eth/api/cketh-minter.api';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import type { IcCkMetadata } from '$icp/types/ic-token';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Network } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import { isNetworkICP } from '$lib/utils/network.utils';
import { AnonymousIdentity } from '@dfinity/agent';
import type { MinterInfo } from '@dfinity/cketh';
import { isNullish, queryAndUpdate } from '@dfinity/utils';
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
			ckEthMinterInfoStore.set({ id: tokenId, data: { data, certified } }),
		onUpdateError: ({ error }) => {
			// We silence the error here because we display a visual error when we try to effectively use the information
			console.error(error);

			ckEthMinterInfoStore.reset(tokenId);
		},
		identity: new AnonymousIdentity()
	});
};

export const assertCkEthMinterInfoLoaded = ({
	minterInfo,
	network
}: {
	minterInfo: OptionCertifiedMinterInfo;
	network?: Network;
}): { valid: boolean } => {
	if (!isNetworkICP(network)) {
		return { valid: true };
	}

	if (isNullish(minterInfo)) {
		const {
			send: {
				assertion: { minter_info_not_loaded }
			}
		} = get(i18n);

		toastsError({
			msg: {
				text: minter_info_not_loaded
			}
		});
		return { valid: false };
	}

	if (!minterInfo.certified) {
		const {
			send: {
				assertion: { minter_info_not_certified }
			}
		} = get(i18n);

		toastsError({
			msg: {
				text: minter_info_not_certified
			}
		});
		return { valid: false };
	}

	return { valid: true };
};
