<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';

	interface Props {
		loading: boolean;
		children: Snippet;
	}

	const { loading, children }: Props = $props();
</script>

{#if loading}
	<SkeletonCards rows={5} />
{:else}
	<div in:fade>
		{@render children()}
	</div>
{/if}
