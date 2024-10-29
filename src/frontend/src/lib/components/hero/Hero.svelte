<script lang="ts">
	import HeroContent from '$lib/components/hero/HeroContent.svelte';

	export let usdTotal = false;
	export let summary = false;
</script>

<article class="relative flex flex-col items-center rounded-lg pb-6">
	<HeroContent {usdTotal} {summary} />
</article>
