<script lang="ts">
	export let disabled = false;
	export let button: HTMLButtonElement | undefined = undefined;
	export let testId: string | undefined = undefined;
	export let ariaLabel: string;
</script>

<button
	class="min-w-[72px] w-full flex flex-col text-white text-lg font-bold text-center gap-3.5 border border-r-white border-opacity-25 rounded-none px-2 overflow-hidden text-ellipsis break-words"
	bind:this={button}
	on:click
	aria-label={ariaLabel}
	{disabled}
	class:opacity-50={disabled}
	data-tid={testId}
>
	<slot name="icon" />
	<div class="max-w-[72px]">
		<slot />
	</div>
</button>
