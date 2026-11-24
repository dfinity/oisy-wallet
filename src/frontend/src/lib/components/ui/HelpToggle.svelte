<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconHelp from '$lib/components/icons/lucide/IconHelp.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		// Whether the explanation it shows and hides is open.
		expanded: boolean;
		ariaLabel?: string;
		// Ids that name the toggle together, e.g. its own id and its row's label ("Info Principal"),
		// where several toggles share a page and "Info" alone would read the same for each.
		ariaLabelledby?: string;
		id?: string;
		// Spacing, colour and size only: the tap area and the press are built in.
		styleClass?: string;
		icon?: Snippet;
		// For an explanation that owns its state (a Collapsible): the toggle asks it to toggle
		// instead of flipping `expanded` itself.
		onToggle?: () => void;
	}

	let {
		expanded = $bindable(),
		ariaLabel,
		ariaLabelledby,
		id,
		styleClass = '',
		icon,
		onToggle
	}: Props = $props();

	const onclick = () => {
		if (nonNullish(onToggle)) {
			onToggle();
			return;
		}

		expanded = !expanded;
	};
</script>

<button
	{id}
	class={`hit-area relative press-icon ${styleClass}`}
	aria-expanded={expanded}
	aria-label={ariaLabel ?? $i18n.core.text.info}
	aria-labelledby={ariaLabelledby}
	{onclick}
	type="button"
>
	{#if icon}
		{@render icon()}
	{:else}
		<IconHelp size="18" />
	{/if}
</button>
