<script lang="ts">
	export let isActive = false;
	export let label: string;
</script>

<button class="mb-2 flex cursor-pointer items-center gap-2" aria-label={label} on:click>
	<span
		class="h-4 w-4 rounded-full border-4 shadow-sm"
		class:bg-off-white={isActive}
		class:bg-primary={!isActive}
		class:border-brand-primary={isActive}
		class:border-primary-inverted={!isActive}
	></span>

	{label}
</button>

{#if isActive}
	<slot name="content" />
{/if}
