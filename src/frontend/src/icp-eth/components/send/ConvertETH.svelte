<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import { isNullish } from '@dfinity/utils';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { ETHEREUM_TOKEN_ID } from '$icp-eth/constants/tokens.constants';
	import { networkICP } from '$lib/derived/network.derived';
	import { tokenId } from '$lib/derived/token.derived';
	import { ckEthMinterInfoStore } from '$icp/stores/cketh.store';

	// TODO ETHEREUM or Sepolia token ID

	// Convert ETH to ckETH can be executed on Ethereum and ckETH pages, therefore we use Ethereum for both statically.
	const convertTokenId = ETHEREUM_TOKEN_ID;

	const isDisabled = (): boolean =>
		$addressNotLoaded ||
		isNullish($ckEthHelperContractAddressStore?.[convertTokenId]) ||
		($networkICP && isNullish($ckEthMinterInfoStore?.[$tokenId]));

	const openSend = async () => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		if ($networkICP) {
			modalStore.openConvertCkETHToETH();
			return;
		}

		modalStore.openConvertETHToCkETH();
	};
</script>

<CkEthLoader>
	<button
		class="hero col-span-2"
		on:click={async () => await openSend()}
		disabled={$isBusy}
		class:opacity-50={$isBusy}
	>
		<slot />
	</button>
</CkEthLoader>
