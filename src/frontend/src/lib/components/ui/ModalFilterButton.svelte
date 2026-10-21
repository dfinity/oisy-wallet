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
		// Only for a trigger that opens a popover; one that moves to another step stays unset.
		opened?: boolean;
	}

	let {
		ariaLabel,
		disabled = false,
		onclick,
		children,
		button = $bindable(),
		opened
	}: Props = $props();
</script>

<button
	bind:this={button}
	class="dropdown-button border"
	class:opened
	aria-expanded={opened}
	aria-label={ariaLabel}
	{disabled}
	{onclick}
	type="button"
>
	{@render children()}
	<span class="dropdown-chevron" aria-hidden="true">
		<IconExpandMore />
	</span>
</button>
