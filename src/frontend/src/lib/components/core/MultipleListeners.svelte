<script lang="ts">
	import { authSignedIn } from '$lib/derived/auth.derived';
	import type { OptionToken, Token } from '$lib/types/token';
	import { mapListeners } from '$lib/utils/listener.utils';
	import type { TokenToListener } from '$lib/types/listener';

	export let tokens: OptionToken[];

	let listeners: TokenToListener[];
	$: listeners = $authSignedIn ? mapListeners(tokens) : [];
</script>

{#each listeners as { token, listener }}
	<svelte:component this={listener} {token} />
{/each}

<slot />
