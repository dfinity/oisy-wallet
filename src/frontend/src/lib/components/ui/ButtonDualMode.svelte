<script lang="ts">
	export let compact = false;
	export let disabled = false;
	export let alt: string;
</script>

<button
	class:flex-1={!compact}
	class:hero={!compact}
	class:text-blue={compact}
	class:hover:text-dark-blue={compact}
	class:active:text-dark-blue={compact}
	class:p-2={compact}
	{disabled}
	class:opacity-50={disabled}
	on:click
	aria-label={alt}
>
	{#if compact}
		<slot name="icon-only" />
	{:else}
		<slot name="text-icon" />
		<span><slot /></span>{/if}</button
>
