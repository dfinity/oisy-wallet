<script lang="ts">
	import { modalCkETHReceive } from '$lib/derived/modal.derived';
	import { setContext } from 'svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { modalStore } from '$lib/stores/modal.store';
	import IcReceiveCkETHModal from '$icp/components/receive/IcReceiveCkETHModal.svelte';
	import IcReceiveButton from '$icp/components/receive/IcReceiveButton.svelte';
	import { ckEthereumToken } from '$icp-eth/derived/cketh.derived';

	/**
	 * Send modal context store
	 */

	const { sendToken, ...rest } = initSendContext({
		sendPurpose: 'convert-eth-to-cketh',
		token: $ckEthereumToken
	});
	setContext<SendContext>(SEND_CONTEXT_KEY, {
		sendToken,
		...rest
	});

	$: sendToken.set($ckEthereumToken);
</script>

<IcReceiveButton on:click={modalStore.openCkETHReceive} />

{#if $modalCkETHReceive}
	<IcReceiveCkETHModal />
{/if}
