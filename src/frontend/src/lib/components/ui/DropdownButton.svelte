<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';

	export let disabled = false;
	export let button: HTMLButtonElement | undefined = undefined;
	export let ariaLabel: string;
	export let opened = false;
	export let testId: string | undefined = undefined;
</script>

<button
	class="border-tertiary hover:border-brand-primary min-w-72 justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-left leading-5 font-medium text-black text-inherit"
	bind:this={button}
	on:click
	aria-label={ariaLabel}
	data-tid={testId}
	{disabled}
	class:opacity-50={disabled}
	class:border-brand-primary={opened}
>
	<slot />
	<div class="transform transition-transform duration-300 ease-in-out" class:-scale-y-100={opened}>
		<IconExpandMore size="24" />
	</div>
</button>
