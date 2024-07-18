<script lang="ts">
	export let disabled = false;
	export let ariaLabel: string;
</script>

<button
	class="no-underline hover:text-blue active:text-blue w-full text-left"
	aria-label={ariaLabel}
	on:click
	{disabled}
	class:opacity-50={disabled}
>
	<slot />
</button>
