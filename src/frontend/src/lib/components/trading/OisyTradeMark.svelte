<script lang="ts">
	import IconLineChart from '$lib/components/icons/lucide/IconLineChart.svelte';

	interface Props {
		// Tailwind size utility for the round mark (e.g. `size-20` in the hero,
		// `size-11` in the info box).
		sizeClass?: string;
		iconSize?: string;
	}

	let { sizeClass = 'size-20', iconSize = '38' }: Props = $props();
</script>

<!--
	Interim OISY TRADE mark: the Trade line-chart icon on a branded circle, a
	placeholder until the final round brand-mark asset is available.
-->
<div
	class={`flex shrink-0 items-center justify-center rounded-full bg-brand-primary text-primary-inverted ${sizeClass}`}
	aria-label="OISY TRADE"
	role="img"
>
	<IconLineChart size={iconSize} />
</div>
