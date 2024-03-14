<script lang="ts">
	import { loadCkEthHelperContractAddress } from '$icp-eth/services/cketh.services';
	import { ethToCkETHEnabled } from '$icp-eth/derived/cketh.derived';
	import { icrcTokensStore } from '$icp/stores/icrc.store';
	import {
		IC_CKETH_MINTER_CANISTER_ID,
		LOCAL_CKETH_MINTER_CANISTER_ID,
		STAGING_CKETH_MINTER_CANISTER_ID
	} from '$env/networks.ircrc.env';
	import { ethereumToken } from '$eth/derived/token.derived';
	import { SEPOLIA_TOKEN_ID } from '$env/tokens.env';
	import { LOCAL } from '$lib/constants/app.constants';
	import { isNullish } from '@dfinity/utils';
	import { toastsError } from '$lib/stores/toasts.store';

	const load = async () => {
		if (!$ethToCkETHEnabled) {
			return;
		}

		const { id: tokenId } = $ethereumToken;

		// TODO: this is relatively ugly. Should we create a derived store or another abstraction that merge EthToken and CkCanisters?

		const minterCanisterId =
			tokenId === SEPOLIA_TOKEN_ID
				? LOCAL
					? LOCAL_CKETH_MINTER_CANISTER_ID
					: STAGING_CKETH_MINTER_CANISTER_ID
				: IC_CKETH_MINTER_CANISTER_ID;

		if (isNullish(minterCanisterId)) {
			toastsError({
				msg: {
					text: 'Error while loading the ckETH helper contract address. No minter canister ID has been initialized.'
				}
			});
			return;
		}

		await loadCkEthHelperContractAddress({
			tokenId,
			canisters: {
				minterCanisterId
			}
		});
	};

	$: $ethToCkETHEnabled, $icrcTokensStore, $ethereumToken, (async () => await load())();
</script>

<slot />
