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
		testId?: string;
	}

	let {
		children,
		onClick,
		disabled = false,
		button = $bindable(),
		ariaLabel,
		opened = false,
		testId
	}: Props = $props();
</script>

<button
	class="dropdown-button"
	bind:this={button}
	onclick={onClick}
	aria-label={ariaLabel}
	data-tid={testId}
	{disabled}
	class:disabled
	class:opened
>
	{@render children?.()}
	<div class="transform transition-transform duration-300 ease-in-out" class:-scale-y-100={opened}>
		<IconExpandMore size="24" />
	</div>
</button>
