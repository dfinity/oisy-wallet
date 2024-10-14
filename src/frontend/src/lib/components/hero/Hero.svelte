<script lang="ts">
	import { slide } from 'svelte/transition';
	import HeroContent from '$lib/components/hero/HeroContent.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';

	export let usdTotal = false;
	export let summary = false;
	export let back = false;
	export let testId: string | undefined = undefined;
</script>

<article
	class="relative flex flex-col items-center rounded-lg pb-6"
	transition:slide={SLIDE_PARAMS}
	data-tid={testId}
>
	<HeroContent {usdTotal} {summary} {back} />
</article>
