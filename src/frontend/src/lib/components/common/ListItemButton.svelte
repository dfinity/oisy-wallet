<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconGixCheck from '$lib/components/icons/IconGixCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		onclick: () => void;
		selectable?: boolean;
		selected?: boolean;
		children: Snippet;
		testId?: string;
	}

	const { onclick, selectable, selected, children, testId }: Props = $props();
</script>

<Button
	alignLeft
	colorStyle="tertiary-alt"
	fullWidth
	{onclick}
	pressed={selectable ? selected : undefined}
	static
	styleClass="py-3 rounded-md text-primary underline-none pl-0.5 min-w-28 row-feedback menu-row"
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
	<span class="font-normal">{@render children()}</span>
</Button>

<style lang="scss">
	:global(button.menu-row) {
		--focus-outline-offset: -3px;
	}
</style>
