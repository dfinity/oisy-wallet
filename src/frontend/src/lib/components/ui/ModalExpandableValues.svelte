<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import Collapsible from '$lib/components/ui/Collapsible.svelte';

	interface Props {
		listHeader: Snippet;
		listItems: Snippet;
	}

	let { listHeader, listItems }: Props = $props();
</script>

<div class="modal-expandable-values" in:fade>
	<Collapsible>
		{#snippet header()}
			<!-- The width of the item below should be 100% - collapsible expand button width (1.5rem) -->
			<div class="flex w-[calc(100%-1.5rem)] items-center">
				{@render listHeader()}
			</div>
		{/snippet}

		{@render listItems()}
	</Collapsible>
</div>

<style lang="scss">
	:global(.modal-expandable-values > div.contents > div.header > button.collapsible-expand-icon) {
		justify-content: flex-end;
	}
</style>
