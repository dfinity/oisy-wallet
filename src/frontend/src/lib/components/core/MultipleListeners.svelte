<script lang="ts">
	import Listener from '$lib/components/core/Listener.svelte';
	import type { OptionToken } from '$lib/types/token.js';

	export let tokens: OptionToken[];
</script>

{#each tokens as token}
	<Listener {token} />
{/each}

<slot />
