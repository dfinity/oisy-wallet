<script lang="ts">
	import { modalCkETHReceive } from '$lib/derived/modal.derived';
	import { setContext } from 'svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$eth/stores/send.store';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import IcReceiveCkETHModal from '$icp/components/receive/IcReceiveCkETHModal.svelte';

	/**
	 * Send modal context store
	 */

	const context = initSendContext({ sendPurpose: 'convert-eth-to-cketh' });
	setContext<SendContext>(SEND_CONTEXT_KEY, context);
</script>

<button
	class="flex-1 hero"
	disabled={$isBusy}
	class:opacity-50={$isBusy}
	on:click={modalStore.openCkETHReceive}
>
	<IconReceive size="28" />
	<span>Receive</span></button
>

{#if $modalCkETHReceive}
	<IcReceiveCkETHModal />
{/if}
