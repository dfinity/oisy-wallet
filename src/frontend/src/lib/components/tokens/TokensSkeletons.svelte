<script lang="ts">
	import type { Snippet } from 'svelte';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { MOBILE_SHELL } from '$lib/constants/mobile.constants';
	import { fade } from '$lib/utils/transitions.utils';

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
	<div in:fade={MOBILE_SHELL ? { duration: 0 } : undefined}>
		{@render children()}
	</div>
{/if}
