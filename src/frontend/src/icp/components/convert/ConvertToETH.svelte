<script lang="ts">
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import IconBurn from '$lib/components/icons/IconBurn.svelte';
	import { modalConvertCkETHToETH } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { address } from '$lib/derived/address.derived';
	import { ckETHTwinTokenNetworkId, ckETHTwinTokenId } from '$icp-eth/derived/cketh.derived';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<ConvertETH convertTokenId={$ckETHTwinTokenId}>
	<IconBurn size="28" />
	<span>{$i18n.convert.text.convert_to_eth}</span>
</ConvertETH>

{#if $modalConvertCkETHToETH}
	<IcSendModal networkId={$ckETHTwinTokenNetworkId} destination={$address ?? ''} />
{/if}
