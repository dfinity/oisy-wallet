<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Button from '$lib/components/ui/Button.svelte';
	import CollapsibleBottomSheet from '$lib/components/ui/CollapsibleBottomSheet.svelte';

	interface Props {
		withTrigger?: boolean;
		sheetTitle?: string;
	}

	let { withTrigger = false, sheetTitle }: Props = $props();
</script>

<CollapsibleBottomSheet {sheetTitle} trigger={withTrigger ? customTrigger : undefined}>
	{#snippet contentHeader()}
		<span>header</span>
	{/snippet}

	{#snippet content()}
		<span>content</span>
	{/snippet}
</CollapsibleBottomSheet>

{#snippet customTrigger({ open }: { open: () => void })}
	{#if nonNullish(open)}
		<Button onclick={open} testId="custom-trigger">open me</Button>
	{/if}
{/snippet}
