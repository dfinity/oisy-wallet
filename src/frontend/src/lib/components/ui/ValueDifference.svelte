<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';

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
		// When true, values above the warning threshold stay neutral instead of
		// turning green. The limit-order crossing-gate is neutral/amber/red only
		// (no "success" green); swap keeps its green by leaving this false.
		successNeutral?: boolean;
		iconPosition?: 'right' | 'left';
	}

	let {
		value,
		// Defaults match the swap thresholds (see swap.constants).
		warningLevel = -1,
		errorLevel = -5,
		muted = false,
		successNeutral = false,
		iconPosition = 'right'
	}: Props = $props();

	let isError = $derived(!muted && nonNullish(value) && value <= errorLevel);

	let isWarning = $derived(
		!muted && nonNullish(value) && value <= warningLevel && value > errorLevel
	);

	let isSuccess = $derived(!muted && nonNullish(value) && value > warningLevel);

	let showWarningIcon = $derived(isWarning || isError);

	// Round before signing so a sub-0.005 magnitude reads as a clean "0.00%"
	// rather than "-0.00%" (or a spurious "+0.00%"): toFixed keeps the sign of a
	// negative rounding-to-zero, so we must snap through Number() first.
	let text = $derived.by((): string => {
		if (isNullish(value)) {
			return '';
		}
		const rounded = Number(value.toFixed(2));
		return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}%`;
	});
</script>

{#snippet valueDifferenceWarningIcon()}
	<span>⚠</span>
{/snippet}

{#if nonNullish(value) && Number.isFinite(value)}
	<span
		class="inline-flex items-center gap-1"
		class:font-bold={isWarning || isError}
		class:gap-2={iconPosition === 'left'}
		class:text-error-primary={isError}
		class:text-primary={muted || (isSuccess && successNeutral)}
		class:text-success-primary={isSuccess && !successNeutral}
		class:text-warning-primary={isWarning}
	>
		{#if showWarningIcon && iconPosition === 'left'}
			{@render valueDifferenceWarningIcon()}
		{/if}
		<span>
			{text}
		</span>
		{#if showWarningIcon && iconPosition === 'right'}
			{@render valueDifferenceWarningIcon()}
		{/if}
	</span>
{/if}
