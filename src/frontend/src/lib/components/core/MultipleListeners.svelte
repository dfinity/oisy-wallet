<script lang="ts">
	import { authSignedIn } from '$lib/derived/auth.derived';
	import type { OptionToken } from '$lib/types/token';
	import { mapListeners } from '$lib/utils/listener.utils';

	interface Props {
		tokens: OptionToken[];
	}

	let { tokens }: Props = $props();

	let listeners = $derived($authSignedIn ? mapListeners(tokens) : []);
</script>

{#each listeners as { token, listener: Listener } (token.id)}
	<Listener {token} />
{/each}
