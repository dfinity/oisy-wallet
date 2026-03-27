<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		label: string;
		selected: boolean;
		testId?: string;
		onclick: MouseEventHandler<HTMLButtonElement>;
		children: Snippet;
	}

	const { label, selected, testId, onclick, children }: Props = $props();
</script>

<Button
	ariaLabel={label}
	colorStyle={selected ? 'primary' : 'tertiary'}
	{onclick}
	paddingSmall
	styleClass={`rounded-none first-of-type:border-l-tertiary border-r-tertiary border-y-tertiary first-of-type:rounded-s-xl last-of-type:rounded-e-xl py-1.5 px-2.75 ${selected ? 'hover:bg-brand-primary' : 'hover:text-brand-primary hover:bg-brand-subtle-10'}`}
	{testId}
>
	{@render children()}
</Button>
