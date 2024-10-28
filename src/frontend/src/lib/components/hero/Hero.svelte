<script lang="ts">
	import { slide } from 'svelte/transition';
	import HeroContent from '$lib/components/hero/HeroContent.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';

	export let usdTotal = false;
	export let summary = false;
</script>

<article
	class="relative flex flex-col items-center rounded-lg py-6"
	transition:slide={SLIDE_PARAMS}
>
	<HeroContent {usdTotal} {summary} />
</article>
