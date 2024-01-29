<script lang="ts">
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$eth/stores/send.store';
	import { setContext } from 'svelte';
	import SendEthModal from '$eth/components/send/SendEthModal.svelte';
	import type { Network } from '$lib/types/network';
	import { token } from '$lib/derived/token.derived';

	export let destination = '';
	export let network: Network | undefined = undefined;
	export let purpose: 'send' | 'convert-eth-to-cketh' = 'send';

	/**
	 * Send modal context store
	 */
	const { sendToken, ...rest } = initSendContext();

	setContext<SendContext>(SEND_CONTEXT_KEY, {
		sendToken,
		...rest
	});

	$: sendToken.set($token);
</script>

<SendEthModal {destination} {network} {purpose} />
