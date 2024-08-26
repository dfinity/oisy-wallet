<script lang="ts">
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import { modalConvertToTwinTokenEth } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import {
		ckEthereumTwinTokenNetworkId,
		ckEthereumTwinToken,
		ckEthereumNativeTokenId,
		ckEthereumNativeToken
	} from '$icp-eth/derived/cketh.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import IconConvert from '$lib/components/icons/IconConvert.svelte';
</script>

<ConvertETH
	nativeTokenId={$ckEthereumNativeTokenId}
	nativeNetworkId={$ckEthereumNativeToken.network.id}
	ariaLabel={replacePlaceholders($i18n.convert.text.convert_to_token, {
		$token: $ckEthereumTwinToken.symbol
	})}
>
	<IconConvert size="28" slot="icon" />
	<span
		>{replacePlaceholders($i18n.convert.text.convert_to_token, {
			$token: $ckEthereumTwinToken.symbol
		})}</span
	>
</ConvertETH>

{#if $modalConvertToTwinTokenEth}
	<IcSendModal networkId={$ckEthereumTwinTokenNetworkId} destination={$ethAddress ?? ''} />
{/if}
