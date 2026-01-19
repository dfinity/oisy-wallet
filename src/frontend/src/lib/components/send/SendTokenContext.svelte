<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionToken } from '$lib/types/token';

	interface Props {
		token: OptionToken;
		children: Snippet;
		customSendBalance?: OptionBalance;
	}

	let { token, children, customSendBalance }: Props = $props();

	let selectedToken = $derived(token ?? DEFAULT_ETHEREUM_TOKEN);

	/**
	 * Send modal context store
	 */
	const { sendToken, ...rest } = initSendContext({
		// TODO: This statement is not reactive. Check if it is intentional or not.
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally
		token: token ?? DEFAULT_ETHEREUM_TOKEN,
		// TODO: This statement is not reactive. Check if it is intentional or not.
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally
		customSendBalance
	});

	setContext<SendContext>(SEND_CONTEXT_KEY, {
		sendToken,
		...rest
	});

	$effect(() => {
		sendToken.set(selectedToken);
	});
</script>

{@render children()}
