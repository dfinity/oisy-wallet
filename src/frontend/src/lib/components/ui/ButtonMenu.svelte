<script lang="ts">
	export let disabled = false;
	export let ariaLabel: string;
	export let testId: string | undefined = undefined;
</script>

<button
	class="w-full text-left no-underline hover:text-brand-primary active:text-brand-primary"
	data-tid={testId}
	aria-label={ariaLabel}
	on:click
	{disabled}
	class:opacity-50={disabled}
>
	<slot />
</button>
