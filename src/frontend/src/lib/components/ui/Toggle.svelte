<script lang="ts">
	// adapted from https://www.florin-pop.com/blog/2019/05/dark-light-theme-toggle/
	import { nextElementId } from '$lib/utils/html.utils';

	interface Props {
		checked: boolean;
		ariaLabel: string;
		disabled?: boolean;
		testId?: string;
		onToggle?: (checked: boolean) => void;
	}

	let {
		checked = $bindable(),
		ariaLabel,
		disabled = false,
		testId = 'toggle',
		onToggle
	}: Props = $props();

	const id = nextElementId('toggle-');
</script>

<div class="toggle" class:disabled data-tid={testId}>
	<input
		{id}
		aria-label={ariaLabel}
		{checked}
		{disabled}
		oninput={({ currentTarget }) => onToggle?.(currentTarget.checked)}
		type="checkbox"
	/>
	<label for={id}></label>
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

	.toggle input[type='checkbox'] {
		display: none;
	}

	.toggle label {
		background-color: var(--card-background-contrast);
		border-radius: 50px;
		cursor: pointer;
		display: inline-block;
		position: relative;
		transition: all ease-in-out 0.3s;
		width: var(--padding-4x);
		height: calc(var(--padding-2x) + 2px);
	}

	.toggle label::after {
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

	.toggle input[type='checkbox']:checked ~ label::after {
		transform: translateX(calc(var(--padding-2x) - 4px));
	}
</style>
