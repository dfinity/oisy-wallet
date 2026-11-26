<script lang="ts">
	import Carousel from '$lib/components/carousel/Carousel.svelte';

	interface Props {
		count: number;
	}

	let { count }: Props = $props();
</script>

<Carousel>
	{#each Array.from({ length: count }, (_, i) => i) as i (i)}
		<div>slide {i}</div>
	{/each}
</Carousel>
