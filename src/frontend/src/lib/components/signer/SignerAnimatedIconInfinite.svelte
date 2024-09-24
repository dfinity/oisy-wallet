<script lang="ts">
	import IconInfinite from '$lib/components/icons/IconInfinite.svelte';
</script>

<span class="relative flex w-16 aspect-square">
	<span
		class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-75"
	></span>
	<span
		class="relative inline-flex items-center justify-center rounded-full h-16 w-16 bg-[var(--color-primary)]"
		><IconInfinite /></span
	>
</span>
