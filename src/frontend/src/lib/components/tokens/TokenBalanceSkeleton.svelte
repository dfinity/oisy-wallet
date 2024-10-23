<script lang="ts">
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import type { CardData } from '$lib/types/token-card';

	export let token: CardData;
</script>

{#if token.balance === undefined}
	<span class="mt-2 w-full max-w-[100px]"><SkeletonText /></span>
{:else}
	<slot />
{/if}
