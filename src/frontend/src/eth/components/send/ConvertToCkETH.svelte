<script lang="ts">
	import { modalConvertETHToCkETH } from '$lib/derived/modal.derived';
	import IconBurn from '$lib/components/icons/IconBurn.svelte';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import SendTokenModal from '$eth/components/send/SendTokenModal.svelte';
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { setContext } from 'svelte';
	import { ICP_NETWORK } from '$icp-eth/constants/networks.constants';
	import { ethToken, ethTokenId } from '$eth/derived/eth.derived';

	/**
	 * Send modal context store
	 */

	const context = initSendContext({ sendPurpose: 'convert-eth-to-cketh', token: $ethToken });
	setContext<SendContext>(SEND_CONTEXT_KEY, context);
</script>

<ConvertETH convertTokenId={$ethTokenId}>
	<IconBurn size="28" />
	<span> Convert to ckETH </span>
</ConvertETH>

{#if $modalConvertETHToCkETH}
	<SendTokenModal
		destination={$ckEthHelperContractAddressStore?.[$ethTokenId]?.data ?? ''}
		targetNetwork={ICP_NETWORK}
	/>
{/if}
