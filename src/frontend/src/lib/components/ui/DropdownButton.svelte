<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';

	export let disabled = false;
	export let button: HTMLButtonElement | undefined = undefined;
	export let ariaLabel: string;
	export let opened = false;
</script>

<button
	class="text-secondary min-w-72 justify-between gap-2 rounded-xl border border-light-grey bg-white px-4 py-3 text-left font-medium leading-5 text-inherit hover:border-brand-primary"
	bind:this={button}
	on:click
	aria-label={ariaLabel}
	{disabled}
	class:opacity-50={disabled}
	class:border-brand-primary={opened}
>
	<slot />
	<div class="transform transition-transform duration-300 ease-in-out" class:-scale-y-100={opened}>
		<IconExpandMore size="24" />
	</div>
</button>
