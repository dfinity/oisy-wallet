<script lang="ts">
	import { type Snippet, setContext } from 'svelte';
	import { run } from 'svelte/legacy';
	import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionToken, Token } from '$lib/types/token';

	interface Props {
		token: OptionToken;
		children?: Snippet;
	}

	let { token, children }: Props = $props();

	let selectedToken: Token = $state();
	run(() => {
		selectedToken = token ?? DEFAULT_ETHEREUM_TOKEN;
	});

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

	run(() => {
		sendToken.set(selectedToken);
	});
</script>

{@render children?.()}
