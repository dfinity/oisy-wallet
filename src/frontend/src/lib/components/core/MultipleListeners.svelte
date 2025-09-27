<script lang="ts">
	import type { Snippet } from 'svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import type { OptionToken } from '$lib/types/token';
	import { mapListeners } from '$lib/utils/listener.utils';

	interface Props {
		tokens: OptionToken[];
		children: Snippet;
	}

	let { tokens, children }: Props = $props();

	let listeners = $derived($authSignedIn ? mapListeners(tokens) : []);
</script>

{#each listeners as { token, listener: Listener } (token.id)}
	<Listener {token} />
{/each}

{@render children()}
