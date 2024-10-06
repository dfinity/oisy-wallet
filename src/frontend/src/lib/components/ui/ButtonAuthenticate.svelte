<script lang="ts">
	import IconAstronautArrow from '$lib/components/icons/IconAstronautArrow.svelte';
</script>

<button
	on:click
	class="flex items-center justify-center gap-4 bg-[var(--color-primary)] p-2 font-bold text-white"
>
	<div class="hidden sm:block">
		<slot />
	</div>
	<IconAstronautArrow />
</button>
