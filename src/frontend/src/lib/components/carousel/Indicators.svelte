<script lang="ts">
	import Indicator from '$lib/components/carousel/Indicator.svelte';

	export let currentSlide: number;
	export let totalSlides: number;

	export let onIndicatorClick: (index: number) => void;
</script>

<div class="flex items-center">
	{#each { length: totalSlides } as _, index (`indicator-${index}`)}
		<Indicator {currentSlide} {index} {totalSlides} on:click={() => onIndicatorClick(index)} />
	{/each}
</div>
