<script lang="ts">
	import SeasonalIconAstronautHelmet from '$lib/components/core/SeasonalIconAstronautHelmet.svelte';
	import SeasonalOisyLogoLarge from '$lib/components/core/SeasonalOisyLogoLarge.svelte';
	let { markOnly = false }: { markOnly?: boolean } = $props();
</script>

<div class:mr-3={!markOnly}>
	<SeasonalIconAstronautHelmet />
</div>

{#if !markOnly}<SeasonalOisyLogoLarge />{/if}
