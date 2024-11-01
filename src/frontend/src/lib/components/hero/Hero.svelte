<script lang="ts">
	import HeroContent from '$lib/components/hero/HeroContent.svelte';
	import type { HeroRoute } from '$lib/types/route';

	export let route: HeroRoute;
</script>

<article class="relative flex flex-col items-center rounded-lg pb-6">
	<HeroContent {route} />
</article>
