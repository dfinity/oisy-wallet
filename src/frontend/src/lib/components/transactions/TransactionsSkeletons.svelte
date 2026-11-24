<script lang="ts">
	import type { Snippet } from 'svelte';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { fade } from '$lib/utils/transitions.utils';

	interface Props {
		loading: boolean;
		testIdPrefix?: string;
		children: Snippet;
	}

	let { loading, testIdPrefix, children }: Props = $props();
</script>

{#if loading}
	<SkeletonCards rows={5} {testIdPrefix} />
{:else}
	<div in:fade>
		{@render children()}
	</div>
{/if}
