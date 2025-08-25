<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		onClick: () => void;
		disabled?: boolean;
		button?: HTMLButtonElement;
		ariaLabel: string;
		opened?: boolean;
		fullWidth?: boolean;
		border?: boolean;
		testId?: string;
	}

	let {
		children,
		onClick,
		disabled = false,
		button = $bindable(),
		ariaLabel,
		opened = false,
		fullWidth = false,
		border = false,
		testId
	}: Props = $props();
</script>

<button
	bind:this={button}
	class="dropdown-button"
	class:border
	class:border-tertiary={border}
	class:disabled
	class:opened
	class:w-full={fullWidth}
	aria-label={ariaLabel}
	data-tid={testId}
	{disabled}
	onclick={onClick}
>
	{@render children?.()}
	<div class="transform transition-transform duration-300 ease-in-out" class:-scale-y-100={opened}>
		<IconExpandMore size="24" />
	</div>
</button>
