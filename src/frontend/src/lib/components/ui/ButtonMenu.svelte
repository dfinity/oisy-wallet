<script lang="ts">
	export let disabled = false;
	export let ariaLabel: string;
</script>

<button
	class="hover:text-blue-ribbon active:text-blue-ribbon w-full text-left no-underline"
	aria-label={ariaLabel}
	on:click
	{disabled}
	class:opacity-50={disabled}
>
	<slot />
</button>
