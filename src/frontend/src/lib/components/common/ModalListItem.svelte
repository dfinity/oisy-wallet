<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';

	interface Props {
		label: Snippet;
		content: Snippet;
		styleClass?: string;
		banner?: Snippet;
	}

	let { label, content, banner, styleClass }: Props = $props();
</script>

<ListItem {styleClass}>
	<span class="text-tertiary">{@render label()}</span>

	<span class="flex items-center gap-1">
		{@render content()}
	</span>

	{#if nonNullish(banner)}
		<div class="basis-full">
			{@render banner()}
		</div>
	{/if}
</ListItem>
