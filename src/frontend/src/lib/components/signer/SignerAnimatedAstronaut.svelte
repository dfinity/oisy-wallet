<script lang="ts">
	import IconAstronautWithEyes from '$lib/components/icons/icon-astronaut/IconAstronautWithEyes.svelte';
</script>

<span class="relative flex aspect-square w-10 sm:w-20">
	<span
		class="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-primary opacity-75"
	></span>
	<span
		class="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-brand-primary sm:h-20 sm:w-20"
		><span class="[&>svg]:h-5 [&>svg]:w-auto sm:[&>svg]:h-10 sm:[&>svg]:w-auto"><IconAstronautWithEyes /></span></span
	>
</span>
