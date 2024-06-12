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
	import type { Token } from '$lib/types/token';
	import type { IcCkToken } from '$icp/types/ic';
	import { ETHEREUM_TOKEN } from '$env/tokens.env';

	const { token } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	let twinToken: Token;
	$: twinToken = ($token as IcCkToken)?.twinToken ?? ETHEREUM_TOKEN;

	/**
	 * Send modal context store
	 */

	const { sendToken, ...rest } = initSendContext({
		sendPurpose: 'convert-eth-to-cketh',
		token: twinToken
	});
	setContext<SendContext>(SEND_CONTEXT_KEY, {
		sendToken,
		...rest
	});

	$: sendToken.set(twinToken);
</script>

<ReceiveButton on:click={modalStore.openCkETHReceive} />

{#if $modalCkETHReceive}
	<IcReceiveCkEthereumModal />
{/if}
