<script lang="ts">
	import { Tooltip } from '@dfinity/gix-components';
	import { type Snippet, type Snippet, onDestroy } from 'svelte';

	interface Props {
		text: string;
		delay?: number;
		children?: Snippet;
	}

	const { text, delay = 1500, children }: Props = $props();

	let timer = $state<NodeJS.Timeout | undefined>();
	let tooltipActive = $state(false);

	const handleEnter = () => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			tooltipActive = true;
		}, delay);
	};

	const handleLeave = () => {
		clearTimeout(timer);
		tooltipActive = false;
	};

	onDestroy(() => clearTimeout(timer));
</script>

<div class="relative inline-block">
	{#snippet trigger()}
		<span
			class="inline-block sm:py-1"
			onblur={handleLeave}
			onfocus={handleEnter}
			onmouseenter={handleEnter}
			onmouseleave={handleLeave}
			role="button"
			tabindex="0"
		>
			{@render children?.()}
		</span>
	{/snippet}

	{#if tooltipActive}
		<Tooltip {text}>
			{@render trigger()}
		</Tooltip>
	{:else}
		{@render trigger()}
	{/if}
</div>
