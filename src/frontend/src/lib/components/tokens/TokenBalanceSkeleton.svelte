<script lang="ts">
	import type { Snippet } from 'svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import type { CardData } from '$lib/types/token-card';

	interface Props {
		data: CardData;
		children?: Snippet;
	}

	let { data, children }: Props = $props();
</script>

{#if data.balance === undefined}
	<span class="mt-1 block w-full max-w-[50px]"><SkeletonText /></span>
{:else}
	{@render children?.()}
{/if}
