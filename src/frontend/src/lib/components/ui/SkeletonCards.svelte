<script lang="ts">
	import SkeletonCard from '$lib/components/ui/SkeletonCard.svelte';
	import { nonNullish } from '@dfinity/utils';

	export let rows: number;
	export let testIdPrefix :string|undefined = undefined;

	let cards: number[];
	$: cards = Array.from({ length: rows }, (_, i) => i);
</script>

{#each cards as i}
	<SkeletonCard testId={nonNullish(testIdPrefix) ? `${testIdPrefix}-${i}` : undefined} />
{/each}
