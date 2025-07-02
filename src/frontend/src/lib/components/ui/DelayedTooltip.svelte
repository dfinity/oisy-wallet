<script lang="ts">
	import { Tooltip } from '@dfinity/gix-components';
	import { onDestroy } from 'svelte';

	interface Props {
		text: string;
		delay?: number;
	}

	const { text, delay = 1500 }: Props = $props()

	let timer = $state<ReturnType<typeof setTimeout>>();
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
	{#if tooltipActive}
		<Tooltip {text}>
			<span
				class="inline-block sm:py-1"
				role="button"
				tabindex="0"
				onmouseenter={handleEnter}
				onmouseleave={handleLeave}
				onfocus={handleEnter}
				onblur={handleLeave}
			>
				<slot />
			</span>
		</Tooltip>
	{:else}
		<span
			class="inline-block sm:py-1"
			role="button"
			tabindex="0"
			onmouseenter={handleEnter}
			onmouseleave={handleLeave}
			onfocus={handleEnter}
			onblur={handleLeave}
		>
			<slot />
		</span>
	{/if}
</div>
