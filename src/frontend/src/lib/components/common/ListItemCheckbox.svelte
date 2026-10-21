<script lang="ts">
	import type { Snippet } from 'svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';

	interface Props {
		inputId: string;
		checked: boolean;
		onChange: () => void;
		children: Snippet;
	}

	let { inputId, checked, onChange, children }: Props = $props();
</script>

<li>
	<Checkbox {checked} {inputId} {onChange} text="inline">
		{@render children()}
	</Checkbox>
</li>

<style lang="scss">
	@use '../../styles/mixins/interaction';

	// A multi-select row: the box, then the label. Height and inset come from the menu-row
	// properties, so the row is as dense as its host: 36px in a dropdown, 44px there on a touch
	// screen, 48px in a sheet. The 1px taken off the padding is the Checkbox's transparent border.
	// The focus ring is drawn inside, so a list that scrolls on its own cannot clip it.
	li :global(.checkbox) {
		--checkbox-label-order: 1;
		--checkbox-padding: calc(var(--menu-row-padding-block) - 1px)
			calc(var(--menu-row-padding-inline) - 1px);
		--focus-outline-offset: -3px;
		justify-content: flex-start;
		gap: 8px;
		min-height: var(--menu-row-min-height);
		border-radius: 8px;
		transition: background-color 0.15s ease-out;

		// `row-feedback`'s fills and timing, spelled out: Checkbox takes no class, and the `pressed:`
		// variant on the list item would skip presses on the Checkbox's own `[role='button']`.
		@include interaction.hover {
			background-color: var(--color-background-brand-subtle-10);
		}

		&:active {
			background-color: var(--color-background-brand-subtle-20);
			transition-duration: 0s;
		}
	}

	// A long label truncates; the box keeps its size.
	li :global(input[type='checkbox']) {
		flex-shrink: 0;
	}

	li :global(label) {
		flex: initial;
		min-width: 0;
		display: inline-flex;
		align-items: center;
	}
</style>
