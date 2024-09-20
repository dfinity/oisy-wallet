<script lang="ts">
	export let button: HTMLButtonElement | undefined = undefined;
	export let testId: string | undefined = undefined;
	export let ariaLabel: string;
</script>

<button
	class="w-16 flex flex-col text-primary text-xs font-normal text-center"
	bind:this={button}
	on:click
	aria-label={ariaLabel}
	data-tid={testId}
>
	<div class="rounded-full bg-white p-2 border border-primary">
		<slot />
	</div>
</button>
