<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconExpandMore from '$lib/components/icons/IconExpandMore.svelte';

	interface Props {
		children?: Snippet;
		onClick: () => void;
		disabled?: boolean;
		button?: HTMLButtonElement;
		// Only for a trigger without visible text: a label would replace the text voice-control users
		// say to reach it (WCAG 2.5.3). Put extra context in ariaDescription instead.
		ariaLabel?: string;
		ariaDescription?: string;
		opened?: boolean;
		fullWidth?: boolean;
		border?: boolean;
		// For a trigger beside 40 px icon buttons: on touch screens it keeps their height and grows
		// only its tap area to 44 px, instead of its box.
		hitArea?: boolean;
		testId?: string;
	}

	let {
		children,
		onClick,
		disabled = false,
		button = $bindable(),
		ariaLabel,
		ariaDescription,
		opened = false,
		fullWidth = false,
		border = false,
		hitArea = false,
		testId
	}: Props = $props();

	const descriptionId = $props.id();
</script>

<button
	bind:this={button}
	class="dropdown-button"
	class:border
	class:disabled
	class:hit-area={hitArea}
	class:hit-area-touch={hitArea}
	class:opened
	class:relative={hitArea}
	class:w-full={fullWidth}
	aria-describedby={nonNullish(ariaDescription) ? descriptionId : undefined}
	aria-expanded={opened}
	aria-label={ariaLabel}
	data-tid={testId}
	{disabled}
	onclick={onClick}
	type="button"
>
	{@render children?.()}
	<span class="dropdown-chevron" aria-hidden="true">
		<IconExpandMore />
	</span>
	<!-- hidden keeps it out of the button's name; aria-describedby still reads it. -->
	{#if nonNullish(ariaDescription)}
		<span id={descriptionId} hidden>{ariaDescription}</span>
	{/if}
</button>
