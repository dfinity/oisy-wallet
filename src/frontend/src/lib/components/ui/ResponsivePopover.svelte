<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import Popover from '$lib/components/ui/Popover.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';

	interface Props {
		visible: boolean;
		button?: HTMLButtonElement;
		content: Snippet;
		ariaLabel?: string;
		// A heading above the popover content, and on the sheet's header row beside its close button.
		title?: string;
		// Replaces the sheet's minimum content height, for content that already fills it.
		sheetContentClass?: string;
		direction?: 'rtl' | 'ltr';
		dropdown?: boolean;
	}

	let {
		visible = $bindable(),
		button,
		content,
		ariaLabel,
		title,
		sheetContentClass,
		direction = 'rtl',
		dropdown = false
	}: Props = $props();

	let dialogLabel = $derived(ariaLabel ?? title);
</script>

<!-- The ranges must not overlap: at a width where both render, the popover mounts under the
visible sheet yet counts as the topmost overlay, and pulls keyboard focus away from the sheet. -->
<Responsive up="md">
	<Popover
		anchor={button}
		ariaLabel={dialogLabel}
		{direction}
		{dropdown}
		invisibleBackdrop
		bind:visible
	>
		{#if nonNullish(title)}
			<p class="mb-3 text-sm font-bold">{title}</p>
		{/if}

		{@render content()}
	</Popover>
</Responsive>
<Responsive down="sm">
	<BottomSheet
		ariaLabel={dialogLabel ?? button?.getAttribute('aria-label') ?? undefined}
		{content}
		contentClass={sheetContentClass}
		{title}
		bind:visible
	>
		{#snippet footer()}
			<ButtonDone onclick={() => (visible = false)} variant="secondary-light" />
		{/snippet}
	</BottomSheet>
</Responsive>
