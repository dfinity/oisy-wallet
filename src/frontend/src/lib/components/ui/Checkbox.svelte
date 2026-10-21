<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		inputId: string;
		checked: boolean;
		preventDefault?: boolean;
		disabled?: boolean;
		text?: 'block' | 'inline';
		testId?: string;
		children?: Snippet;
		onChange?: () => void;
	}

	let {
		inputId,
		checked = $bindable(),
		preventDefault = false,
		disabled = false,
		text = 'inline',
		testId,
		children,
		onChange
	}: Props = $props();

	// The component never mutates `checked`: it mirrors the consumer's value
	// one-way and only emits `onChange`, leaving the consumer to flip its own
	// state. Binding it here as well would double-toggle.
	const onClick = (event: MouseEvent | TouchEvent) => {
		if (disabled) {
			return;
		}

		if (preventDefault) {
			event.preventDefault();
		}

		onChange?.();
	};

	// A native checkbox toggles on Space only. Enter toggled the row when the row took focus;
	// keep that, and keep Enter from submitting a surrounding form.
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.code !== 'Enter') {
			return;
		}

		event.preventDefault();
		onChange?.();
	};
</script>

<!-- The input is the control: it takes focus, toggles on Space and tells assistive tech its
	 checked state. The row only widens the click target, so it carries no role of its own. -->
<div
	class="checkbox"
	class:disabled
	data-tid={testId}
	onclick={(event) => {
		event.preventDefault();
		onClick(event);
	}}
	role="presentation"
>
	<label class={text} for={inputId}>{@render children?.()}</label>
	<input
		id={inputId}
		{checked}
		data-tid="checkbox"
		{disabled}
		onclick={(event) => {
			event.stopPropagation();
			onClick(event);
		}}
		onkeydown={onKeyDown}
		type="checkbox"
	/>
</div>

<style lang="scss">
	@use '../../styles/mixins/text';
	@use '../../styles/mixins/interaction';

	.checkbox {
		display: flex;
		justify-content: space-between;
		align-items: var(--checkbox-align-items, center);
		gap: var(--padding);

		height: fit-content;

		// OISY's former gix.scss override set `--checkbox-padding: 0` globally;
		// folded in here as the default so unstyled consumers keep zero padding.
		padding: var(--checkbox-padding, 0);

		color: var(--checkbox-color);

		@include interaction.tappable;

		font-size: var(--checkbox-font-size, inherit);

		--input-custom-border-color: var(--disable-contrast);

		border: var(--input-border-size) solid transparent;
		outline: none;

		border-radius: var(--checkbox-border-radius, var(--border-radius));

		--checkbox-input-size: 20px;

		// Folded in from the former global gix.scss `div.checkbox, div.radio`
		// override layer, now that OISY owns this component. Hover brightens the
		// border for both states, but only a checked box also darkens its fill — an
		// unchecked box keeps its resting background, since a solid hover fill would
		// read as already selected.
		&:hover input {
			--secondary: var(--color-background-brand-secondary) !important;
			--input-custom-border-color: var(--color-background-brand-secondary);

			// form.input-focus (border only)
			border: var(--input-border-size) solid var(--secondary);
		}

		&:hover input:checked {
			--focus-background: var(--color-background-brand-secondary);
			--input-background: var(--color-background-brand-secondary);

			background: var(--focus-background);
			color: var(--focus-background-contrast);
		}

		&.disabled {
			pointer-events: none;
		}

		// The input takes focus, but the ring stays round the whole row, where the global focus
		// rule drew it when the row itself was focusable.
		&:has(input:focus-visible) {
			outline: var(--color-background-brand-primary) solid 2px;
			outline-offset: var(--focus-outline-offset, 2px);
		}
	}

	label {
		user-select: none;
		cursor: pointer;

		flex: 1;
		order: var(--checkbox-label-order);

		color: var(--value-color);

		&.inline {
			@include text.truncate;
		}
	}

	// One ring only: the row draws it, so the global one on the box goes. That rule is an
	// `!important` inside `@layer base`, which outranks any unlayered `!important`, so the reset
	// joins the same layer and wins there on specificity.
	@layer base {
		input[type='checkbox']:focus-visible {
			outline: none !important;
		}
	}

	/** https://moderncss.dev/pure-css-custom-styled-radio-buttons/ **/
	/** accent-color not supported yet on Safari 😩 **/

	input[type='checkbox'] {
		appearance: none;
		margin: 0;

		width: var(--checkbox-input-size);
		height: var(--checkbox-input-size);

		border-radius: var(--border-radius-0_5x);

		cursor: pointer;

		position: relative;

		box-sizing: border-box;

		// form.input
		background: var(--input-background);
		color: var(--input-background-contrast);
		border: var(--input-border-size) solid
			var(--input-error-color, var(--input-custom-border-color, var(--input-border-color)));

		transition:
			color var(--animation-time-short) ease-out,
			background var(--animation-time-short) ease-out,
			border var(--animation-time-short) ease-in;

		&:focus {
			// form.input-focus
			border: var(--input-border-size) solid var(--secondary);
			background: var(--focus-background);
			color: var(--focus-background-contrast);
		}

		&::placeholder {
			color: var(--disable-contrast);
		}

		// Folded in from the former global gix.scss `div.checkbox, div.radio`
		// override layer.
		--focus-background: var(--color-background-primary);

		&:focus {
			--focus-background: var(--color-background-primary);
		}

		&:checked {
			--focus-background: var(--color-background-brand-primary-alt);
			--input-custom-border-color: var(--color-background-brand-primary-alt);
			--input-background: var(--color-background-brand-primary-alt);

			&:hover:not(:active),
			&:focus:not(:active) {
				--secondary: var(--color-background-brand-secondary);
				--focus-background: var(--color-background-brand-secondary);
				--input-custom-border-color: var(--color-background-brand-secondary);
			}
		}

		&:checked:after {
			--background-contrast: var(--color-foreground-primary-inverted);
		}

		&[disabled],
		&[disabled]:hover {
			cursor: default;

			&:checked:after {
				border-color: var(--disable-contrast);
			}
		}

		&:checked:after {
			left: 5px;
			top: 1px;
			width: 6px;
			height: 10px;
			border: solid var(--background-contrast);
			border-width: 0 2px 2px 0;
			transform: rotate(45deg);
			display: block;
			content: '';
			position: absolute;
			box-sizing: content-box;
		}
	}
</style>
