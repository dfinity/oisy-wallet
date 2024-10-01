<script lang="ts">
	export let button: HTMLButtonElement | undefined = undefined;
	export let testId: string | undefined = undefined;
	export let ariaLabel: string;
</script>

<button
	class="icon text-primary flex flex-col text-center text-xs font-normal"
	bind:this={button}
	on:click
	aria-label={ariaLabel}
	data-tid={testId}
>
	<div class="border-primary rounded-full border bg-white p-2">
		<slot name="icon" />
	</div>
	<span class="visually-hidden"><slot /></span>
</button>
