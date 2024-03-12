<script lang="ts">
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import IconBurn from '$lib/components/icons/IconBurn.svelte';
	import { modalConvertCkETHToETH } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { address } from '$lib/derived/address.derived';
	import { ETHEREUM_NETWORK_ID } from '$icp-eth/constants/networks.constants';

	// TODO: if ckETH => SEPOLIA_NETWORK else ETHEREUM_NETWORK
</script>

<ConvertETH convertTokenId={ETHEREUM_NETWORK_ID}>
	<IconBurn size="28" />
	<span>Convert to ETH</span>
</ConvertETH>

{#if $modalConvertCkETHToETH}
	<IcSendModal networkId={ETHEREUM_NETWORK_ID} destination={$address ?? ''} />
{/if}
