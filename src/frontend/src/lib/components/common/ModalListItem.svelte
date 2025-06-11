<script lang="ts">
	import type { Snippet } from 'svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';

	interface Props {
		label: Snippet;
		content: Snippet;
	}

	let { label, content }: Props = $props();
</script>

<ListItem>
	<span class="text-tertiary">{@render label()}</span>

	<span class="flex items-center gap-1">
		{@render content()}
	</span>
</ListItem>
