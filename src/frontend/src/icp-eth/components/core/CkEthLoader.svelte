<script lang="ts">
	import { loadCkEthHelperContractAddress } from '$icp-eth/services/cketh.services';
	import { ethToCkETHEnabled } from '$icp-eth/derived/cketh.derived';
	import { icrcTokensStore } from '$icp/stores/icrc.store';
	import { CKETH_MINTER_CANISTER_ID } from '$icp/constants/icrc.constants';
	import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';

	const load = async () => {
		if (!$ethToCkETHEnabled) {
			return;
		}

		await loadCkEthHelperContractAddress({
			tokenId: ETHEREUM_TOKEN_ID,
			canisters: {
				minterCanisterId: CKETH_MINTER_CANISTER_ID
			}
		});
	};

	$: $ethToCkETHEnabled, $icrcTokensStore, (async () => await load())();
</script>

<slot />
