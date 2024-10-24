<script lang="ts">
	import { slide } from 'svelte/transition';
	import Alpha from '$lib/components/core/Alpha.svelte';
	import HeroContent from '$lib/components/hero/HeroContent.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';

	export let usdTotal = false;
	export let summary = false;
</script>

<article
	class="relative flex flex-col items-center rounded-lg pb-6"
	transition:slide={SLIDE_PARAMS}
>
	<div class="py-4">
		<Alpha />
	</div>

	<HeroContent {usdTotal} {summary} />
</article>
