<script lang="ts">
	import type { Snippet } from 'svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import type { TokenToListener } from '$lib/types/listener';
	import type { OptionToken } from '$lib/types/token';
	import { mapListeners } from '$lib/utils/listener.utils';

	interface Props {
		tokens: OptionToken[];
		children: Snippet;
	}

	let { tokens, children }: Props = $props();

	let listeners: TokenToListener[] = $derived($authSignedIn ? mapListeners(tokens) : []);
</script>

{#each listeners as { token, listener: ListenerCmp } (token.id)}
	<ListenerCmp {token} />
{/each}

{@render children()}
