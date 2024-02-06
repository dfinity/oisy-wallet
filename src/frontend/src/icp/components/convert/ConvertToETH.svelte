<script lang="ts">
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import IconConvert from '$lib/components/icons/IconConvert.svelte';
	import { modalConvertCkETHToETH } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { ETHEREUM_NETWORK_ID } from '$lib/constants/networks.constants';
</script>

<ConvertETH>
	<IconConvert size="28" />
	<span>Convert to ETH</span>
</ConvertETH>

{#if $modalConvertCkETHToETH}
	<IcSendModal networkId={ETHEREUM_NETWORK_ID} />
{/if}
