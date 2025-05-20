<script lang="ts">
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import type { CardData } from '$lib/types/token-card';

	export let data: CardData;
</script>

{#if data.balance === undefined}
	<span class="mt-1 block w-full max-w-[50px]"><SkeletonText /></span>
{:else}
	<slot />
{/if}
