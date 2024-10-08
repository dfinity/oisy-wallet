<script lang="ts">
	import HeroContent from '$lib/components/hero/HeroContent.svelte';

	export let usdTotal = false;
	export let summary = false;
	export let actions = true;
	export let back = false;
</script>

<article class="main relative flex flex-col items-center rounded-lg pb-6 pt-10">
	<HeroContent {usdTotal} {summary} {actions} {back} />
</article>
