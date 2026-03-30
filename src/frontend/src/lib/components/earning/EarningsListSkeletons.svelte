<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import EarningCardSkeleton from '$lib/components/earning/EarningCardSkeleton.svelte';
	import { EARNING_CARD_SKELETON } from '$lib/constants/test-ids.constants';

	interface Props {
		loading: boolean;
		children: Snippet;
	}

	const { loading, children }: Props = $props();

	const SKELETON_ROWS = 3;
	let cards = $derived(Array.from({ length: SKELETON_ROWS }, (_, i) => i));
</script>

{#if loading}
	<div class="flex flex-col gap-3">
		{#each cards as i (`${EARNING_CARD_SKELETON}-${i}`)}
			<EarningCardSkeleton testId={`${EARNING_CARD_SKELETON}-${i}`} />
		{/each}
	</div>
{:else}
	<div in:fade>
		{@render children()}
	</div>
{/if}
