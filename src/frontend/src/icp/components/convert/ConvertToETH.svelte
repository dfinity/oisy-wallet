<script lang="ts">
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import IconBurn from '$lib/components/icons/IconBurn.svelte';
	import { modalConvertCkETHToETH } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { address } from '$lib/derived/address.derived';
	import { ckEthereumNetworkId, ckEthereumTokenId } from '$icp-eth/derived/cketh.derived';
</script>

<ConvertETH convertTokenId={$ckEthereumTokenId}>
	<IconBurn size="28" />
	<span>Convert to ETH</span>
</ConvertETH>

{#if $modalConvertCkETHToETH}
	<IcSendModal networkId={$ckEthereumNetworkId} destination={$address ?? ''} />
{/if}
