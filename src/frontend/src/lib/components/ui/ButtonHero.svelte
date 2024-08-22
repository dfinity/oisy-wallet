<script lang="ts">
	export let disabled = false;
	export let button: HTMLButtonElement | undefined = undefined;
	export let ariaLabel: string;
</script>

<button
	class="w-16 flex flex-col text-white text-xs font-normal text-center"
	bind:this={button}
	on:click
	aria-label={ariaLabel}
	{disabled}
	class:opacity-50={disabled}
>
	<div class="rounded-full p-2 bg-black bg-opacity-30 border border-white border-opacity-20">
		<slot name="icon" />
	</div>
	<slot />
</button>
