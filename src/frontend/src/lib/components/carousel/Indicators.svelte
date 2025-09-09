<script lang="ts">
	import Indicator from '$lib/components/carousel/Indicator.svelte';

	interface Props {
		currentSlide: number;
		totalSlides: number;
		onIndicatorClick: (index: number) => void;
	}

	let { currentSlide, totalSlides, onIndicatorClick }: Props = $props();
</script>

<div class="flex items-center">
	{#each { length: totalSlides } as _, index (`indicator-${index}`)}
		<Indicator {currentSlide} {index} {totalSlides} on:click={() => onIndicatorClick(index)} />
	{/each}
</div>
