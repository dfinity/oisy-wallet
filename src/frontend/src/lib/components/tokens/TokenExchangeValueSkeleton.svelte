<script lang="ts">
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import type { CardData } from '$lib/types/token-card';

	export let data: CardData;
</script>

{#if data.balance === undefined || !$exchangeInitialized}
	<span class="w-full max-w-[50px]"><SkeletonText /></span>
{:else}
	<slot />
{/if}
