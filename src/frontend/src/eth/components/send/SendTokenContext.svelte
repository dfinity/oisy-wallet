<script lang="ts">
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { setContext } from 'svelte';
	import type { Token } from '$lib/types/token';

	export let token: Token;

	/**
	 * Send modal context store
	 */
	const { sendToken, ...rest } = initSendContext({ sendPurpose: 'send', token });

	setContext<SendContext>(SEND_CONTEXT_KEY, {
		sendToken,
		...rest
	});

	$: sendToken.set(token);
</script>

<slot />
