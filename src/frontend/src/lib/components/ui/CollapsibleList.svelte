<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconExpand from '$lib/components/icons/IconExpand.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		items: Snippet[];
		hideExpandButton?: boolean;
	}

	let { items, hideExpandButton = false }: Props = $props();

	let expanded = $state(false);

	let displayItems = $derived(
		(expanded && items.length > 0) || hideExpandButton ? items : [items[0]]
	);
</script>

{#if items.length > 0}
	<div class="flex flex-col">
		<div class="mt-4 flex flex-col px-4">
			{#each displayItems as item, index (`list-item-${index}`)}
				{@render item()}
			{/each}
		</div>

		{#if items.length > 1 && !hideExpandButton}
			<Button
				colorStyle="muted"
				fullWidth
				innerStyleClass="items-center"
				onclick={() => (expanded = !expanded)}
				paddingSmall
				styleClass="text-brand-primary hover:bg-transparent hover:text-brand-secondary"
				transparent
			>
				{expanded ? $i18n.core.text.less : $i18n.core.text.more}
				<IconExpand {expanded} />
			</Button>
		{/if}
	</div>
{/if}
