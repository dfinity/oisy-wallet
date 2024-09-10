<script lang="ts">
	import IconInfinite from '$lib/components/icons/IconInfinite.svelte';
</script>

<h2 class="text-center mb-6">Awaiting communication...</h2>

<div class="flex justify-center py-6">
	<span class="relative flex w-16 aspect-square">
		<span
			class="animate-ping absolute inline-flex h-full w-full rounded-full bg-dodger-blue opacity-75"
		></span>
		<span
			class="relative inline-flex items-center justify-center rounded-full h-16 w-16 bg-dodger-blue"
			><IconInfinite /></span
		>
	</span>
</div>
