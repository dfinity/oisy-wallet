<script lang="ts">
	import { modalCkETHReceive } from '$lib/derived/modal.derived';
	import { setContext } from 'svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$eth/stores/send.store';
	import { modalStore } from '$lib/stores/modal.store';
	import IcReceiveCkETHModal from '$icp/components/receive/IcReceiveCkETHModal.svelte';
	import IcReceiveButton from '$icp/components/receive/IcReceiveButton.svelte';

	/**
	 * Send modal context store
	 */

	const context = initSendContext({ sendPurpose: 'convert-eth-to-cketh' });
	setContext<SendContext>(SEND_CONTEXT_KEY, context);
</script>

<IcReceiveButton on:click={modalStore.openCkETHReceive} />

{#if $modalCkETHReceive}
	<IcReceiveCkETHModal />
{/if}
