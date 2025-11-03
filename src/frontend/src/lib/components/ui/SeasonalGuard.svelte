<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		halloween?: Snippet;
		christmas?: Snippet;
		children: Snippet;
	}

	let { halloween, christmas, children }: Props = $props();

	let halloweenOrChildren = $derived(halloween ?? children);

	let christmasOrChildren = $derived(christmas ?? children);

	let currentDate = $derived(new Date());
	let currentMonth = $derived(currentDate.getMonth());
	let currentDay = $derived(currentDate.getDate());

	// From the 30th of October to the 3rd of November
	let isHalloween = $derived(
		(currentMonth === 9 && currentDay >= 30) ||
			(currentMonth === 10 && currentDay <= 3)
	);

	// From the 18th of December to the 29th of December
	let isChristmas = $derived(
		(currentMonth === 11 && currentDay >= 18) ||
			(currentMonth === 0 && currentDay <= 6)
	);
</script>

{#if isHalloween}
	{@render halloweenOrChildren()}
{:else if isChristmas}
	{@render christmasOrChildren()}
{:else}
	{@render children()}
{/if}
