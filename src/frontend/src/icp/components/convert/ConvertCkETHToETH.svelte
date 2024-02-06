<script lang="ts">
	import { setContext } from 'svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import ConvertETH from '$icp-eth/components/send/ConvertETH.svelte';
	import IconImportExport from '$lib/components/icons/IconImportExport.svelte';
	import { modalConvertCkETHToETH } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';

	/**
	 * Send modal context store
	 */

	const context = initSendContext({ sendPurpose: 'convert-eth-to-cketh' });
	setContext<SendContext>(SEND_CONTEXT_KEY, context);
</script>

<ConvertETH>
	<IconImportExport size="28" />
	<span>Convert to ETH</span>
</ConvertETH>

{#if $modalConvertCkETHToETH}
	<IcSendModal />
{/if}
