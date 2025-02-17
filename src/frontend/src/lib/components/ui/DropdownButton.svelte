<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';

	export let disabled = false;
	export let button: HTMLButtonElement | undefined = undefined;
	export let ariaLabel: string;
	export let opened = false;
	export let testId: string | undefined = undefined;
</script>

<button
	class="min-w-72 gap-2 rounded-xl px-4 py-3 leading-5 font-medium justify-between border border-tertiary bg-primary text-left text-inherit text-primary hover:border-brand-primary"
	bind:this={button}
	on:click
	aria-label={ariaLabel}
	data-tid={testId}
	{disabled}
	class:opacity-50={disabled}
	class:border-brand-primary={opened}
>
	<slot />
	<div class="ease-in-out transform transition-transform duration-300" class:-scale-y-100={opened}>
		<IconExpandMore size="24" />
	</div>
</button>
