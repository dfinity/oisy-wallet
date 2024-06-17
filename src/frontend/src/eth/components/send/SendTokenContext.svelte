<script lang="ts">
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { setContext } from 'svelte';
	import type { Token } from '$lib/types/token';
    import {DEFAULT_ETHEREUM_TOKEN} from "$lib/constants/tokens.constants";

	export let token: Token | undefined;

    let selectedToken: Token;
    $: selectedToken = token ?? DEFAULT_ETHEREUM_TOKEN;

	/**
	 * Send modal context store
	 */
	const { sendToken, ...rest } = initSendContext({
		sendPurpose: 'send',
		token: selectedToken
	});

	setContext<SendContext>(SEND_CONTEXT_KEY, {
		sendToken,
		...rest
	});

	$: sendToken.set(selectedToken);
</script>

<slot />
