<script lang="ts">
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import IconBurn from '$lib/components/icons/IconBurn.svelte';
	import { modalConvertCkETHToETH } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { address } from '$lib/derived/address.derived';
	import {
		ckEthereumTwinTokenNetworkId,
		ckEthereumTwinToken,
		ckEthereumNativeTokenId
	} from '$icp-eth/derived/cketh.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
</script>

<ConvertETH nativeTokenId={$ckEthereumNativeTokenId}>
	<IconBurn size="28" />
	<span
		>{replacePlaceholders($i18n.convert.text.convert_to_token, {
			$token: $ckEthereumTwinToken.symbol
		})}</span
	>
</ConvertETH>

{#if $modalConvertCkETHToETH}
	<IcSendModal networkId={$ckEthereumTwinTokenNetworkId} destination={$address ?? ''} />
{/if}
