<script lang="ts">
	import type { Snippet } from 'svelte';
	import Divider, { type Props as DividerProps } from '$lib/components/common/Divider.svelte';

	interface Props {
		[key: `item${number}`]: Snippet;
		dividerProps?: DividerProps;
	}

	const { dividerProps, ...snippets }: Props = $props();
</script>

{#each Object.entries(snippets) as [key, snippet], index (key)}
	{#if index > 0}
		<Divider {...dividerProps} />
	{/if}{@render snippet()}
{/each}
