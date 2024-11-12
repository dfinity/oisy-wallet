<script lang="ts">
	import SkeletonCard from '$lib/components/ui/SkeletonCard.svelte';

	export let rows: number;
	export let testIdPrefix: string = 'skeleton-card';

	let cards: number[];
	$: cards = Array.from({ length: rows }, (_, i) => i);
</script>

{#each cards as i}
	<SkeletonCard testId={`${testIdPrefix}-${i}`} />
{/each}
