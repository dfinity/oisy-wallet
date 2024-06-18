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
	{disabled}
	class:opacity-50={disabled}
	on:click
	aria-label={alt}
>
	<slot name="icon" />
	{#if !compact}
		<span><slot /></span>{/if}</button
>
