<script lang="ts">
	export let disabled = false;
	export let ariaLabel: string;
</script>

<button
	class="w-full no-underline"
	aria-label={ariaLabel}
	on:click
	{disabled}
	class:opacity-50={disabled}
>
	<slot />
</button>
