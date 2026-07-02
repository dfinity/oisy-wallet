<script lang="ts">
	import IconWarning from '$lib/components/icons/IconWarning.svelte';
	import { LIMIT_ORDER_VALUE_DIFFERENCE_ERROR_PERCENT } from '$lib/constants/oisy-trade.constants';

	interface Props {
		value: number;
		// While the order rests the figure is informational (neutral); only a
		// crossing order is a realized give-up, coloured amber/red.
		crossing: boolean;
	}

	let { value, crossing }: Props = $props();

	// Round before signing so a sub-0.005 magnitude reads as a clean "0.00%"
	// rather than "-0.00%" (or a spurious "+0.00%").
	const rounded = $derived(Number(value.toFixed(2)));
	const text = $derived(`${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}%`);
	const danger = $derived(value < LIMIT_ORDER_VALUE_DIFFERENCE_ERROR_PERCENT);
</script>

<span
	class="inline-flex items-center gap-1 text-sm"
	class:font-semibold={crossing}
	class:text-error-primary={crossing && danger}
	class:text-primary={!crossing}
	class:text-warning-primary={crossing && !danger}
>
	{#if crossing}
		<span class="inline-flex shrink-0 items-center" aria-hidden="true"><IconWarning inline /></span>
	{/if}
	{text}
</span>
