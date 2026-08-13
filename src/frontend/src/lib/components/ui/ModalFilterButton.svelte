<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';
	import IconExpandMore from '$lib/components/icons/IconExpandMore.svelte';

	interface Props {
		ariaLabel: string;
		disabled?: boolean;
		onclick: MouseEventHandler<HTMLButtonElement>;
		children: Snippet;
		button?: HTMLButtonElement;
	}

	let { ariaLabel, disabled = false, onclick, children, button = $bindable() }: Props = $props();
</script>

<button
	bind:this={button}
	class="dropdown-button h-[2.2rem] rounded-lg border border-solid border-primary"
	class:hover:border-brand-primary={!disabled}
	aria-label={ariaLabel}
	{disabled}
	{onclick}
	type="button"
>
	<span class="font-medium">{@render children()}</span>
	<IconExpandMore size="24" />
</button>
