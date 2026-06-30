<script lang="ts">
	import { nonNullish } from '@dfinity/utils';

	interface Props {
		// The signed value difference, in percent (already computed by the caller).
		value: number | undefined;
		// Threshold (inclusive) at/below which the figure turns amber.
		warningLevel?: number;
		// Threshold (inclusive) at/below which the figure turns red.
		errorLevel?: number;
		// When true the figure is rendered as neutral/informational regardless of
		// the thresholds — e.g. a resting limit order that hasn't realized any loss.
		muted?: boolean;
		iconPosition?: 'right' | 'left';
	}

	let {
		value,
		// Defaults match the swap thresholds (see swap.constants).
		warningLevel = -1,
		errorLevel = -5,
		muted = false,
		iconPosition = 'right'
	}: Props = $props();

	let isError = $derived(!muted && nonNullish(value) && value <= errorLevel);

	let isWarning = $derived(
		!muted && nonNullish(value) && value <= warningLevel && value > errorLevel
	);

	let isSuccess = $derived(!muted && nonNullish(value) && value > warningLevel);

	let showWarningIcon = $derived(isWarning || isError);
</script>

{#snippet valueDifferenceWarningIcon()}
	<span>⚠</span>
{/snippet}

{#if nonNullish(value)}
	<span
		class="inline-flex items-center gap-1"
		class:font-bold={isWarning || isError}
		class:gap-2={iconPosition === 'left'}
		class:text-error-primary={isError}
		class:text-success-primary={isSuccess}
		class:text-warning-primary={isWarning}
	>
		{#if showWarningIcon && iconPosition === 'left'}
			{@render valueDifferenceWarningIcon()}
		{/if}
		<span>
			{`${value > 0 ? '+' : ''}${value.toFixed(2)}`}%
		</span>
		{#if showWarningIcon && iconPosition === 'right'}
			{@render valueDifferenceWarningIcon()}
		{/if}
	</span>
{/if}
