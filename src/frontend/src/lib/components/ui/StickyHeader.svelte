<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	const SPACING_UNIT = 4;
	const SPACING_TOP = SPACING_UNIT * 6; // since we add pt-6 we need to trigger earlier

	const { children }: Props = $props();

	let rootElement: HTMLElement | undefined = $state();
	let alignmentElement: HTMLElement | undefined = $state();
	let { originalWidth, originalHeight }: { originalWidth?: number; originalHeight?: number } =
		$state({});

	let scrolledSoon = $state(false);
	let scrolledPast = $state(false);

	const handleScroll = () => {
		if (!rootElement) {
			return;
		}
		const rect = rootElement.getBoundingClientRect();
		scrolledSoon = rect.top <= SPACING_TOP * 4;
		scrolledPast = rect.top <= SPACING_TOP;
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

<svelte:window on:scroll={handleScroll} on:resize={debounce(() => calcSizes(true), 250)} />

<div bind:this={rootElement} style={`height: ${originalHeight ?? 0}px`} class="relative">
	<!-- to avoid lower sticky headers to peek in front when using multiple, we add px-1 and add one SPACING_UNIT to the width below -->
	<!-- and whitespace-nowrap is needed to ensure when we first calc the height its the correct size which is given if no linebreaks -->
	<div
		bind:this={alignmentElement}
		style={`width: ${(originalWidth ?? 0) + SPACING_UNIT}px`}
		class="z-3 whitespace-nowrap px-1"
		class:absolute={nonNullish(originalHeight)}
		class:bg-page={scrolledSoon}
		class:fixed={scrolledPast}
		class:pt-6={scrolledPast}
		class:top-0={scrolledPast}
	>
		{@render children()}
	</div>
</div>
