<script lang="ts">
	export let disabled = false;
	export let button: HTMLButtonElement | undefined = undefined;
	export let testId: string | undefined = undefined;
	export let ariaLabel: string;
</script>

<button
	class="flex w-full min-w-[72px] flex-col gap-3.5 overflow-hidden text-ellipsis break-words rounded-none border border-r-white border-opacity-25 px-2 text-center text-lg font-bold text-white last:border-none"
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
