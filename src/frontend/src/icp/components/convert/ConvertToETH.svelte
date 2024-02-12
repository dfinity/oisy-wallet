<script lang="ts">
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import IconBurn from '$lib/components/icons/IconBurn.svelte';
	import { modalConvertCkETHToETH } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { ETHEREUM_NETWORK_ID } from '$lib/constants/networks.constants';
	import { address } from '$lib/derived/address.derived';
</script>

<ConvertETH>
	<IconBurn size="28" />
	<span>Convert to ETH</span>
</ConvertETH>

{#if $modalConvertCkETHToETH}
	<IcSendModal networkId={ETHEREUM_NETWORK_ID} destination={$address ?? ''} />
{/if}
