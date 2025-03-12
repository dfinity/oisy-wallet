<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';

	export let disabled = false;
	export let button: HTMLButtonElement | undefined = undefined;
	export let ariaLabel: string;
	export let opened = false;
	export let testId: string | undefined = undefined;
</script>

<button
	class="dropdown-button"
	bind:this={button}
	on:click
	aria-label={ariaLabel}
	data-tid={testId}
	{disabled}
	class:disabled
	class:opened
>
	<slot />
	<div class="transform transition-transform duration-300 ease-in-out" class:-scale-y-100={opened}>
		<IconExpandMore size="24" />
	</div>
</button>
