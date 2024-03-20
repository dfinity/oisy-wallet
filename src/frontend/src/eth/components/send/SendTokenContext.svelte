<script lang="ts">
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { setContext } from 'svelte';
	import { token } from '$lib/derived/token.derived';
	import { ethereumToken } from '$eth/derived/token.derived';

	/**
	 * Send modal context store
	 */
	const { sendToken, ...rest } = initSendContext({ sendPurpose: 'send', token: $ethereumToken });

	setContext<SendContext>(SEND_CONTEXT_KEY, {
		sendToken,
		...rest
	});

	$: sendToken.set($token);
</script>

<slot />
