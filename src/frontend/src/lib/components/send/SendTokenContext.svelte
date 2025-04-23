<script lang="ts">
	import { setContext } from 'svelte';
	import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionToken, Token } from '$lib/types/token';

	export let token: OptionToken;

	let selectedToken: Token;
	$: selectedToken = token ?? DEFAULT_ETHEREUM_TOKEN;

	/**
	 * Send modal context store
	 */
	const { sendToken, ...rest } = initSendContext({
		token: selectedToken
	});

	setContext<SendContext>(SEND_CONTEXT_KEY, {
		sendToken,
		...rest
	});

	$: sendToken.set(selectedToken);
</script>

<slot />
