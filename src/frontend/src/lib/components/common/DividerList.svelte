<script lang="ts">
	import type { Snippet } from 'svelte';
	import Divider, {type  Props as DividerProps } from '$lib/components/common/Divider.svelte';
	
	interface Props {
		[key: `item${number}`]: Snippet;
		dividerProps?: DividerProps;
		dividerColor?: string;
	}

	const { dividerProps, dividerColor = '', ...snippets }: Props = $props();
</script>

<span class="flex flex-row items-center">
	{#each Object.entries(snippets) as [key, snippet], index (key)}
		{#if index > 0}
			<span class={dividerColor}><Divider {...dividerProps} /></span>
		{/if}
		<span class="mr-1.5 flex" class:ml-1.5={index > 0}>
			{@render snippet()}
		</span>
	{/each}
</span>
