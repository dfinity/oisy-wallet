<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import { isNullish } from '@dfinity/utils';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { networkICP } from '$lib/derived/network.derived';
	import { tokenId } from '$lib/derived/token.derived';
	import { ckEthMinterInfoStore } from '$icp/stores/cketh.store';
	import type { TokenId } from '$lib/types/token';
	import { SUPPORTED_ETHEREUM_TOKEN_IDS } from '$env/tokens.env';

	export let convertTokenId: TokenId;

	// TODO check ckEthMinterInfoStore for sepolia

	const isDisabled = (): boolean =>
		$addressNotLoaded ||
		// We can convert to ETH - i.e. we can convert to Ethereum or Sepolia, not an ERC20 token
		!SUPPORTED_ETHEREUM_TOKEN_IDS.includes(convertTokenId) ||
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

<CkEthLoader {convertTokenId}>
	<button
		class="hero col-span-2"
		on:click={async () => await openSend()}
		disabled={$isBusy}
		class:opacity-50={$isBusy}
	>
		<slot />
	</button>
</CkEthLoader>
