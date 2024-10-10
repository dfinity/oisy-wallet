<script lang="ts">
	import { quintOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import HeroContent from '$lib/components/hero/HeroContent.svelte';

	export let usdTotal = false;
	export let summary = false;
	export let back = false;
</script>

<article
	class="relative flex flex-col items-center rounded-lg pb-6 pt-10"
	transition:slide={{ delay: 0, duration: 250, easing: quintOut, axis: 'y' }}
>
	<HeroContent {usdTotal} {summary} {back} />
</article>
