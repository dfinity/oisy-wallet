<script lang="ts">
	import HeroContent from '$lib/components/hero/HeroContent.svelte';

	export let usdTotal = false;
	export let summary = false;
	export let actions = true;
	export let back = false;
</script>

<article class="relative flex flex-col items-center rounded-lg">
	<HeroContent {usdTotal} {summary} {actions} {back} />
</article>
