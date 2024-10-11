<!-- source: DFINITY foundation -->
<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Token } from '$lib/types/token';

	export let token: Token;
</script>

<div class="flex flex-row items-center justify-between gap-2">
	{token.symbol}

	{#if nonNullish(token.network.iconBW)}
		<svelte:component this={token.network.iconBW} />
	{/if}
</div>
