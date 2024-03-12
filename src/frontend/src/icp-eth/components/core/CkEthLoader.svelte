<script lang="ts">
	import { loadCkEthHelperContractAddress } from '$icp-eth/services/cketh.services';
	import { ethToCkETHEnabled } from '$icp-eth/derived/cketh.derived';
	import { icrcTokensStore } from '$icp/stores/icrc.store';
	import { CKETH_MINTER_CANISTER_ID } from '$icp/constants/icrc.constants';
	import { ethTokenId } from '$eth/derived/eth.derived';

	const load = async () => {
		if (!$ethToCkETHEnabled) {
			return;
		}

		await loadCkEthHelperContractAddress({
			tokenId: $ethTokenId,
			canisters: {
				minterCanisterId: CKETH_MINTER_CANISTER_ID
			}
		});
	};

	$: $ethToCkETHEnabled, $icrcTokensStore, $ethTokenId, (async () => await load())();
</script>

<slot />
