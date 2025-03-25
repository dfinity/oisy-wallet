<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import SkeletonCard from '$lib/components/ui/SkeletonCard.svelte';

	export let rows: number;
	export let testIdPrefix: string | undefined = undefined;

	let cards: number[];
	$: cards = Array.from({ length: rows }, (_, i) => i);
</script>

{#each cards as i (`${testIdPrefix ?? 'skeleton-card'}-${i}`)}
	<SkeletonCard testId={nonNullish(testIdPrefix) ? `${testIdPrefix}-${i}` : undefined} />
{/each}
