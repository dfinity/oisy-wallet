<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import SkeletonCard from '$lib/components/ui/SkeletonCard.svelte';

	interface Props {
		rows: number;
		testIdPrefix?: string;
	}

	let { rows, testIdPrefix }: Props = $props();

	let cards = $derived(Array.from({ length: rows }, (_, i) => i));
</script>

{#each cards as i (`${testIdPrefix ?? 'skeleton-card'}-${i}`)}
	<SkeletonCard testId={nonNullish(testIdPrefix) ? `${testIdPrefix}-${i}` : undefined} />
{/each}
