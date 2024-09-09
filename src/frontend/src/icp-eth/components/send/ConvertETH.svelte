<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { isNotSupportedEthTokenId } from '$eth/utils/eth.utils';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { toCkEthHelperContractAddress } from '$icp-eth/utils/cketh.utils';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';
	import { ethAddressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { networkICP } from '$lib/derived/network.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { modalStore } from '$lib/stores/modal.store';
	import type { NetworkId } from '$lib/types/network';
	import type { TokenId } from '$lib/types/token';

	export let nativeTokenId: TokenId;
	export let ariaLabel: string;
	// TODO: to be removed once minterInfo breaking changes have been executed on mainnet
	export let nativeNetworkId: NetworkId;

	const isDisabled = (): boolean =>
		$ethAddressNotLoaded ||
		// We can convert to ETH - i.e. we can convert to Ethereum or Sepolia, not an ERC20 token
		isNotSupportedEthTokenId(nativeTokenId) ||
		isNullish(
			toCkEthHelperContractAddress($ckEthMinterInfoStore?.[nativeTokenId], nativeNetworkId)
		) ||
		($networkICP && isNullish($ckEthMinterInfoStore?.[nativeTokenId]));

	const openSend = async () => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		if ($networkICP) {
			modalStore.openConvertToTwinTokenEth();
			return;
		}

		modalStore.openConvertToTwinTokenCkEth();
	};
</script>

<CkEthLoader {nativeTokenId}>
	<ButtonHero on:click={async () => await openSend()} disabled={$isBusy} {ariaLabel}>
		<slot name="icon" slot="icon" />
		<slot />
	</ButtonHero>
</CkEthLoader>
