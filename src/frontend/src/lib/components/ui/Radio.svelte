<script lang="ts">
	interface Props {
		checked: boolean;
		disabled?: boolean;
		onChange: () => void;
		inputId?: string;
		testId?: string;
	}

	const { checked, disabled = false, onChange, inputId, testId }: Props = $props();
</script>

<div class="radio" class:disabled data-tid={testId} role="button" tabindex="0">
	<input
		id={inputId}
		{checked}
		data-tid="radio"
		{disabled}
		onchange={onChange}
		tabindex="-1"
		type="radio"
	/>
</div>

<style lang="scss">
	// same as checkbox styles from gix
	.radio {
		display: flex;
		justify-content: space-between;
		align-items: var(--checkbox-align-items, center);
		gap: var(--padding);

		height: fit-content;

		touch-action: manipulation;
		cursor: pointer;

		padding: var(--checkbox-padding, var(--padding-2x));

		color: var(--checkbox-color);

		font-size: var(--checkbox-font-size, inherit);

		--input-custom-border-color: var(--disable-contrast);

		border: var(--input-border-size) solid transparent;
		outline: none;

		border-radius: var(--checkbox-border-radius, var(--border-radius));

		--checkbox-input-size: 20px;

		&:hover {
			input {
				border: var(--input-border-size) solid var(--secondary);
				background: var(--focus-background);
				color: var(--focus-background-contrast);
			}
		}

		&.disabled {
			pointer-events: none;
		}
	}

	/** https://moderncss.dev/pure-css-custom-styled-radio-buttons/ **/
	/** accent-color not supported yet on Safari 😩 **/

	input[type='radio'] {
		appearance: none;
		margin: 0;

		width: var(--checkbox-input-size);
		height: var(--checkbox-input-size);

		border-radius: var(--border-radius-lg);

		cursor: pointer;

		position: relative;

		box-sizing: border-box;

		background: var(--input-background);
		color: var(--input-background-contrast);
		border: var(--input-border-size) solid
			var(--input-error-color, var(--input-custom-border-color, var(--input-border-color)));

		transition:
			color var(--animation-time-short) ease-out,
			background var(--animation-time-short) ease-out,
			border var(--animation-time-short) ease-in;

		&::placeholder {
			color: var(--disable-contrast);
		}

		&[disabled],
		&[disabled]:hover {
			cursor: default;

			&:checked:after {
				border-color: var(--disable-contrast);
			}
		}

		// only customization specifically for radio compared to checkboxes from gix
		&:checked:after {
			content: '';
			position: absolute;
			width: calc(var(--checkbox-input-size) / 3);
			height: calc(var(--checkbox-input-size) / 3);
			border-radius: var(--border-radius-lg);
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: var(--background-contrast);
			border: var(--input-border-size) solid var(--input-border-color);
		}
	}
</style>
