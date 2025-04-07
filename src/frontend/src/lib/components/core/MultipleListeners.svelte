<script lang="ts">
	import { authSignedIn } from '$lib/derived/auth.derived';
	import type { TokenToListener } from '$lib/types/listener';
	import type { OptionToken } from '$lib/types/token';
	import { mapListeners } from '$lib/utils/listener.utils';

	export let tokens: OptionToken[];

	let listeners: TokenToListener[];
	$: listeners = $authSignedIn ? mapListeners(tokens) : [];
</script>

{#each listeners as { token, listener } (token.id)}
	<svelte:component this={listener} {token} />
{/each}

<slot />
