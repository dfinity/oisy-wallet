import { minterInfo } from '$icp-eth/api/cketh-minter.api';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import type { IcCkMetadata } from '$icp/types/ic-token';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Network } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import { consoleError } from '$lib/utils/console.utils';
import { isNetworkICP } from '$lib/utils/network.utils';
import { isNullish, queryAndUpdate } from '@dfinity/utils';
import type { CkEthMinterDid } from '@icp-sdk/canisters/cketh';
import { AnonymousIdentity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

// The tokens whose minter information is being loaded. The loader is asked again whenever the stores
// it watches change, which they do repeatedly while the app starts, and one load is enough.
const loadingTokenIds = new Set<TokenId>();

export const loadCkEthMinterInfo = async ({
	tokenId,
	canisters: { minterCanisterId }
}: {
	tokenId: TokenId;
	canisters: IcCkMetadata;
}) => {
	const minterInfoInStore = get(ckEthMinterInfoStore)?.[tokenId];

	// We try to load only once per session the helpers (ckETH and ckErc20) contract addresses: until
	// the minter certifies them, or fails to. An answer that is not certified yet, such as the one the
	// minter information worker queries while the app starts up, is not enough: the flows that check
	// requests against these addresses hold them until the certified answer is in.
	if (
		minterInfoInStore === null ||
		minterInfoInStore?.certified === true ||
		loadingTokenIds.has(tokenId)
	) {
		return;
	}

	loadingTokenIds.add(tokenId);

	try {
		await queryAndUpdate<CkEthMinterDid.MinterInfo>({
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
				consoleError(error);

				ckEthMinterInfoStore.reset(tokenId);
			},
			identity: new AnonymousIdentity(),
			// With an uncertified answer already in, only the certified one is missing.
			strategy: isNullish(minterInfoInStore) ? 'query_and_update' : 'update',
			// Settled once the certified answer is in too, so the load counts as running until then.
			resolution: 'all_settled'
		});
	} finally {
		loadingTokenIds.delete(tokenId);
	}
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
