<script lang="ts">
	import { fade } from 'svelte/transition';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		loading: boolean;
		children: Snippet;
	}

	const { loading, children }: Props = $props();
</script>

{#if loading}
	<div class="flex flex-col gap-2 p-2">
		<SkeletonCards rows={5} />
	</div>
{:else}
	<div in:fade>
		{@render children()}
	</div>
{/if}
