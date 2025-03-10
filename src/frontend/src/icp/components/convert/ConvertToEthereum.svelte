<script lang="ts">
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import ConvertETH from '$icp-eth/components/convert/ConvertETH.svelte';
	import {
		ckEthereumTwinTokenNetworkId,
		ckEthereumTwinToken,
		ckEthereumNativeTokenId
	} from '$icp-eth/derived/cketh.derived';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { modalConvertToTwinTokenEth } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
</script>

<ConvertETH
	nativeTokenId={$ckEthereumNativeTokenId}
	ariaLabel={replacePlaceholders($i18n.convert.text.convert_to_token, {
		$token: $ckEthereumTwinToken.symbol
	})}
>
	<IconCkConvert size="28" slot="icon" />
	<span>{$ckEthereumTwinToken.symbol}</span>
</ConvertETH>

{#if $modalConvertToTwinTokenEth}
	<IcSendModal networkId={$ckEthereumTwinTokenNetworkId} destination={$ethAddress ?? ''} />
{/if}
