<script lang="ts">
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';

	interface Props {
		options: { value: string; label: string; testId?: string }[];
		value: string;
		ariaLabel: string;
	}

	let { options, value = $bindable(), ariaLabel }: Props = $props();
</script>

<SegmentedControl {ariaLabel} {options} bind:value />

<output data-tid="segmented-control-value">{value}</output>
