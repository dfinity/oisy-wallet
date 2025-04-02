<script lang="ts">
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { exchangeNotInitialized } from '$lib/derived/exchange.derived';
	import type { CardData } from '$lib/types/token-card';

	export let data: CardData;
</script>

{#if data.balance === undefined || $exchangeNotInitialized}
	<span class="block w-full max-w-[50px] pt-1"><SkeletonText /></span>
{:else}
	<slot />
{/if}
