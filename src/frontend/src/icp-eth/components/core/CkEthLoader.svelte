<script lang="ts">
	import { loadCkEthHelperContractAddress } from '$icp-eth/services/cketh.services';
	import { ethToCkETHEnabled } from '$icp-eth/derived/cketh.derived';
	import { icrcTokensStore } from '$icp/stores/icrc.store';
	import { IC_CKETH_MINTER_CANISTER_ID } from '$icp/constants/icrc.constants';
	import { ethTokenId } from '$eth/derived/eth.derived';

	// TODO: pick correct minter ID for network

	const load = async () => {
		if (!$ethToCkETHEnabled) {
			return;
		}

		await loadCkEthHelperContractAddress({
			tokenId: $ethTokenId,
			canisters: {
				minterCanisterId: IC_CKETH_MINTER_CANISTER_ID
			}
		});
	};

	$: $ethToCkETHEnabled, $icrcTokensStore, $ethTokenId, (async () => await load())();
</script>

<slot />
