<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconCloseThin from '$lib/components/icons/IconCloseThin.svelte';
	import IconExpandMore from '$lib/components/icons/IconExpandMore.svelte';

	interface Props {
		label: string;
		clearAriaLabel: string;
		icon?: Snippet;
		// A value is picked: the chip is tinted and offers to clear it.
		hasValue?: boolean;
		opened?: boolean;
		testId?: string;
		// The whole chip, for a popover to line up with its edges.
		anchor?: HTMLElement;
		// The button that opens the options, for the popover to hand focus back to.
		trigger?: HTMLButtonElement;
		onClick: () => void;
		onClear: () => void;
	}

	let {
		label,
		clearAriaLabel,
		icon,
		hasValue = false,
		opened = false,
		testId,
		anchor = $bindable(),
		trigger = $bindable(),
		onClick,
		onClear
	}: Props = $props();

	// The clear button goes inert as the value clears, which would drop keyboard focus on the page.
	const clear = () => {
		onClear();

		trigger?.focus();
	};
</script>

<span bind:this={anchor} class="relative inline-flex max-w-full min-w-0" data-tid={testId}>
	<button
		bind:this={trigger}
		class="dropdown-button compact hit-area relative flex min-w-0 items-center border hit-area-touch"
		class:has-value={hasValue}
		class:opened
		class:with-icon={nonNullish(icon)}
		aria-expanded={opened}
		data-tid={nonNullish(testId) ? `${testId}-trigger` : undefined}
		onclick={onClick}
		type="button"
	>
		{#if nonNullish(icon)}
			<span class="flex shrink-0" aria-hidden="true">{@render icon()}</span>
		{/if}
		<span class="truncate">{label}</span>
		<span class="dropdown-chevron" aria-hidden="true"><IconExpandMore /></span>
	</button>

	<!-- Sits over the trigger's end padding, which `has-value` widens to make room for it. -->
	<button
		class="filter-chip-clear absolute inset-y-0 end-1 my-auto flex size-6 items-center justify-center rounded-full press-icon"
		class:shown={hasValue}
		aria-label={clearAriaLabel}
		data-tid={nonNullish(testId) ? `${testId}-clear` : undefined}
		inert={!hasValue}
		onclick={clear}
		title={clearAriaLabel}
		type="button"
	>
		<IconCloseThin size="16" />
	</button>
</span>

<style lang="scss">
	@use '$lib/styles/mixins/interaction';

	.filter-chip-clear {
		color: var(--color-foreground-brand-hover);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			opacity 0.3s cubic-bezier(0.2, 0, 0, 1),
			background-color 0.15s ease-out;

		// The hidden state only, so `press-icon` owns the scale once it is shown.
		&:not(.shown) {
			opacity: 0;

			@media (prefers-reduced-motion: no-preference) {
				scale: 0.25;
				filter: blur(4px);
			}
		}

		@media (prefers-reduced-motion: no-preference) {
			transition:
				opacity 0.3s cubic-bezier(0.2, 0, 0, 1),
				scale 0.3s cubic-bezier(0.2, 0, 0, 1),
				filter 0.3s cubic-bezier(0.2, 0, 0, 1),
				background-color 0.15s ease-out;
		}

		@include interaction.hover {
			background-color: var(--color-background-brand-subtle-20);
		}

		&:active {
			background-color: var(--color-background-brand-subtle-30);
			transition-duration: 0s;
		}

		// A 40 px tall target (44 px on touch) that grows outward from the button's start, so it never
		// takes clicks from the trigger it sits on (`hit-area` centres on the button and would). 32 px
		// wide reaches 4 px past the chip, half the gap to a filter beside it, never into that filter.
		&::after {
			content: '';
			position: absolute;
			top: 50%;
			inset-inline-start: 0;
			width: 32px;
			height: 40px;
			translate: 0 -50%;

			@include interaction.coarse {
				height: var(--touch-target-min-height);
			}
		}
	}
</style>
