<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();

	let rootElement: HTMLElement | undefined = $state();
	let alignmentElement: HTMLElement | undefined = $state();
	let { originalWidth, originalHeight }: { originalWidth?: number; originalHeight?: number } =
		$state({});

	let scrolledSoon = $state(false);
	let scrolledPast = $state(false);

	const handleScroll = () => {
		if (!rootElement) {return;}

		const rect = rootElement.getBoundingClientRect();
		scrolledSoon = rect.top <= 24 * 4;
		scrolledPast = rect.top <= 24;
	};

	const calcSizes = (force = false) => {
		if (isNullish(rootElement) || isNullish(alignmentElement)) {
			return;
		}

		if (isNullish(originalWidth) || force) {
			originalWidth = rootElement.clientWidth;
		}
		if (isNullish(originalHeight) || force) {
			originalHeight = rootElement.children?.[0].clientHeight;
		}
	};

	$effect(() => {
		calcSizes();
	});
</script>

<svelte:window on:scroll={handleScroll} on:resize={() => calcSizes(true)} />

<div bind:this={rootElement} class="relative block" style={`height: ${originalHeight ?? 0}px`}>
	<div
		class="z-2 block"
		bind:this={alignmentElement}
		class:absolute={nonNullish(originalHeight)}
		class:bg-page={scrolledSoon}
		class:fixed={scrolledPast}
		class:top-0={scrolledPast}
		class:pt-6={scrolledPast}
		style={`width: ${originalWidth ?? 0}px`}
	>
		{@render children()}
	</div>
</div>
