<script lang="ts">
	// adapted from https://www.florin-pop.com/blog/2019/05/dark-light-theme-toggle/
	import { nextElementId } from '$lib/utils/html.utils';

	interface Props {
		checked: boolean;
		ariaLabel: string;
		disabled?: boolean;
		showLabel?: boolean;
		testId?: string;
		onToggle?: (checked: boolean) => void;
	}

	let {
		checked = $bindable(),
		ariaLabel,
		disabled = false,
		showLabel = false,
		testId = 'toggle',
		onToggle
	}: Props = $props();

	const id = nextElementId('toggle-');
</script>

<div class="toggle" class:disabled class:row={showLabel} data-tid={testId}>
	<input
		{id}
		class:hidden={!showLabel}
		class:sr-only={showLabel}
		aria-label={ariaLabel}
		{checked}
		{disabled}
		oninput={({ currentTarget }) => onToggle?.(currentTarget.checked)}
		role={showLabel ? 'switch' : undefined}
		type="checkbox"
	/>
	<label class:row-feedback={showLabel} for={id}>
		{#if showLabel}<span class="toggle-text">{ariaLabel}</span>{/if}
		<span class="track" aria-hidden="true"></span>
	</label>
</div>

<style lang="scss">
	.toggle {
		display: inline-flex;
		align-items: center;
		margin-top: 1px;

		// Folded in from the former global gix.scss override layer, now that
		// OISY owns this component.
		scale: 1.45;
		transform-origin: 50%;
		margin-inline: var(--padding);

		--card-background-contrast: var(--color-background-disabled-alt);
		--card-background: var(--color-base-white);

		&:hover {
			--card-background-contrast: var(--color-background-disabled-alt2);
		}

		&.disabled {
			// Previously --toggle-disabled-opacity, overridden to 1 in gix.scss.
			opacity: 1;

			--card-background: var(--color-background-disabled);
			--card-background-contrast: var(--color-background-disabled);
		}

		&:has(input[type='checkbox']:checked) {
			--card-background-contrast: var(--color-background-brand-primary);

			&:hover {
				--card-background-contrast: var(--color-background-brand-secondary);
			}

			&:active {
				--card-background-contrast: var(--color-background-brand-primary);
			}

			&.disabled {
				--card-background: var(--color-background-primary-alt);
				--card-background-contrast: var(--color-background-brand-subtle-20);
			}
		}

		// Tailwind's `--breakpoint-lg` (1024px) / `--breakpoint-sm` (640px).
		// The `theme()` function is only resolved in Tailwind-processed global
		// styles, not in a component's scoped style, so the values are inlined.
		@media (width < 1024px) {
			scale: 1.6;
			margin-inline: var(--padding);
		}

		@media (width < 640px) {
			scale: 1.8;
			margin-inline: var(--padding-2x);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.toggle input ~ label .track::after {
			transition-property: background-color;
		}
	}

	.toggle input:focus-visible + label {
		outline: 2px solid var(--color-background-brand-primary);
		outline-offset: var(--focus-outline-offset, 3px);
	}

	.toggle label {
		display: inline-flex;
		align-items: center;
		cursor: pointer;
	}
	.toggle.row {
		--focus-outline-offset: -3px;
		scale: 1;
		margin: 0;
		width: 100%;
		label {
			width: 100%;
			justify-content: space-between;
			gap: 16px;
			padding: var(--menu-row-padding-block) var(--menu-row-padding-inline);
			border-radius: var(--border-radius-sm);
		}
		.track {
			flex-shrink: 0;
			scale: 1.45;
			margin-inline: var(--padding);
			@media (width < 1024px) {
				scale: 1.6;
			}
			@media (width < 640px) {
				scale: 1.8;
			}
		}
	}
	.toggle-text {
		font-weight: var(--font-weight-normal);
	}
	.toggle.disabled label {
		cursor: not-allowed;
	}

	.toggle .track {
		background-color: var(--card-background-contrast);
		border-radius: 50px;
		cursor: pointer;
		display: inline-block;
		position: relative;
		transition: all ease-in-out 0.3s;
		width: var(--padding-4x);
		height: calc(var(--padding-2x) + 2px);
	}

	.toggle .track::after {
		border-radius: 50%;
		content: '';
		cursor: pointer;
		display: inline-block;
		position: absolute;
		left: 2px;
		top: 1px;
		transition: all ease-in-out 0.3s;
		width: var(--padding-2x);
		height: var(--padding-2x);

		background: var(--card-background);
	}

	.toggle input[type='checkbox']:checked ~ label .track::after {
		transform: translateX(calc(var(--padding-2x) - 4px));
	}
</style>
