<script lang="ts">
	import SkeletonCard from '$lib/components/ui/SkeletonCard.svelte';

	export let rows: number;

	let cards: number[];
	$: cards = Array.from({ length: rows }, (_, i) => i);
</script>

{#each cards as _}
	<SkeletonCard />
{/each}
