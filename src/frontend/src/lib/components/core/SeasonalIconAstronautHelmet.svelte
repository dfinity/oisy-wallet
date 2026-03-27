<script lang="ts">
	import IconAstronautHelmet from '$lib/components/icons/icon-astronaut/IconAstronautHelmet.svelte';
	import IconAstronautHelmetHalloween from '$lib/components/icons/icon-astronaut/IconAstronautHelmetHalloween.svelte';
	import SeasonalGuard from '$lib/components/ui/SeasonalGuard.svelte';
</script>

<SeasonalGuard>
	{#snippet halloween()}
		<IconAstronautHelmetHalloween />
	{/snippet}

	<IconAstronautHelmet />
</SeasonalGuard>
