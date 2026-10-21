<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconGixCheck from '$lib/components/icons/IconGixCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		onclick: () => void;
		selectable?: boolean;
		selected?: boolean;
		// For a label with parts spread across the row, e.g. a name and a symbol.
		contentFullWidth?: boolean;
		children: Snippet;
		testId?: string;
	}

	const {
		onclick,
		selectable,
		selected,
		contentFullWidth = false,
		children,
		testId
	}: Props = $props();
</script>

<Button
	alignLeft
	colorStyle="tertiary-alt"
	{contentFullWidth}
	fullWidth
	{onclick}
	pressed={selectable ? selected : undefined}
	static
	styleClass="py-3 rounded-md text-primary underline-none pl-0.5 min-w-28 row-feedback menu-row [--focus-outline-offset:-3px]"
	{testId}
	transparent
>
	{#if selectable}
		<span class="flex w-5 shrink-0 items-center text-brand-primary">
			{#if selected}
				<IconGixCheck size="20px" />
			{/if}
		</span>
	{/if}
	<span class="font-normal" class:flex-1={contentFullWidth} class:min-w-0={contentFullWidth}
		>{@render children()}</span
	>
</Button>
