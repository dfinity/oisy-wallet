<script lang="ts">
	export let isActive = false;
	export let label: string;
</script>

<button class="mb-2 flex cursor-pointer items-center gap-2" on:click aria-label={label}>
	<span
		class="h-4 w-4 rounded-full border-4 shadow-sm"
		class:border-brand-primary={isActive}
		class:bg-off-white={isActive}
		class:border-primary-inverted={!isActive}
		class:bg-primary={!isActive}
	></span>

	{label}
</button>

{#if isActive}
	<slot name="content" />
{/if}
