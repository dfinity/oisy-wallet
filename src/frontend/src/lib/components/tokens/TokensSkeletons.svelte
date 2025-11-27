<script lang="ts">
	import { isIOS } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';

	interface Props {
		loading: boolean;
		children: Snippet;
	}

	const { loading, children }: Props = $props();

	let fadeParams = $derived(isIOS() ? { duration: 0 } : undefined);
</script>

{#if loading}
	<div class="flex flex-col gap-2 p-2">
		<SkeletonCards rows={5} />
	</div>
{:else}
	<div in:fade={fadeParams}>
		{@render children()}
	</div>
{/if}
