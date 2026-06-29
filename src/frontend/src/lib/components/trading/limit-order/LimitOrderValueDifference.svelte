<script lang="ts">
	import IconWarning from '$lib/components/icons/IconWarning.svelte';

	interface Props {
		value: number;
		// While the order rests the figure is informational (neutral); only a
		// crossing order is a realized give-up, coloured amber/red.
		crossing: boolean;
	}

	let { value, crossing }: Props = $props();

	const text = $derived(`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`);
	const danger = $derived(value < -5);
</script>

<span
	class="inline-flex items-center gap-1 text-sm"
	class:font-semibold={crossing}
	class:text-error-primary={crossing && danger}
	class:text-primary={!crossing}
	class:text-warning-primary={crossing && !danger}
>
	{#if crossing}
		<span class="flex h-3.5 w-3.5 items-center"><IconWarning /></span>
	{/if}
	{text}
</span>
