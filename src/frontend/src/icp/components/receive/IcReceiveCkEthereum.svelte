<script lang="ts">
	import { modalCkETHReceive } from '$lib/derived/modal.derived';
	import { getContext, setContext } from 'svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { modalStore } from '$lib/stores/modal.store';
	import IcReceiveCkEthereumModal from '$icp/components/receive/IcReceiveCkEthereumModal.svelte';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';

	export let compact = false;

	const { ckEthereumTwinToken, open, close } =
		getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const modalId = Symbol();

	/**
	 * Send modal context store
	 */

	const { sendToken, ...rest } = initSendContext({
		sendPurpose: 'convert-eth-to-cketh',
		token: $ckEthereumTwinToken
	});
	setContext<SendContext>(SEND_CONTEXT_KEY, {
		sendToken,
		...rest
	});

	$: sendToken.set($ckEthereumTwinToken);

	const openReceive = async () => modalStore.openCkETHReceive(modalId);
</script>

<ReceiveButton {compact} on:click={async () => await open(openReceive)} />

{#if $modalCkETHReceive && $modalStore?.data === modalId}
	<IcReceiveCkEthereumModal on:nnsClose={close} />
{/if}
