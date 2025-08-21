<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
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
	styleClass="py-3 rounded-md text-primary underline-none pl-0.5 min-w-28"
	{testId}
	transparent
>
	{#if selectable}
		<span class="pt-0.75 w-[20px] text-brand-primary">
			{#if selected}
				<IconCheck size="20" />
			{/if}
		</span>
	{/if}
	<span class="font-normal">{@render children()}</span>
</Button>
