<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { isNullish } from '@dfinity/utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { networkICP } from '$lib/derived/network.derived';
	import { tokenId } from '$lib/derived/token.derived';
	import type { TokenId } from '$lib/types/token';
	import { isNotSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { toCkEthHelperContractAddress } from '$icp-eth/utils/cketh.utils';

	// TODO: rename to withTokenId?
	export let convertTokenId: TokenId;

	const isDisabled = (): boolean =>
		$addressNotLoaded ||
		// We can convert to ETH - i.e. we can convert to Ethereum or Sepolia, not an ERC20 token
		isNotSupportedEthTokenId(convertTokenId) ||
		isNullish(toCkEthHelperContractAddress($ckEthMinterInfoStore?.[convertTokenId])) ||
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

<button
	class="hero col-span-2"
	on:click={async () => await openSend()}
	disabled={$isBusy}
	class:opacity-50={$isBusy}
>
	<slot />
</button>
