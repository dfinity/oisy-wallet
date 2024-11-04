<script lang="ts">
	export let disabled = false;
	export let ariaLabel: string;
</script>

<button
	class="w-full text-left no-underline hover:text-brand-primary active:text-brand-primary"
	aria-label={ariaLabel}
	on:click
	{disabled}
	class:opacity-50={disabled}
>
	<slot />
</button>
