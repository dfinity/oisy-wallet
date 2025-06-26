<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { isNullish } from '@dfinity/utils';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();

	let rootElement: HTMLElement | undefined = $state();
	let alignmentElement: HTMLElement | undefined = $state();
	let { originalWidth, originalHeight } = $state({ originalWidth: 0, originalHeight: 0 });

	let scrolledSoon = $state(false);
	let scrolledPast = $state(false);

	const handleScroll = () => {
		console.log('scroll');
		if (!rootElement) return;

		const rect = rootElement.getBoundingClientRect();
		scrolledSoon = rect.top <= originalHeight + 16;
		scrolledPast = rect.top <= 16;
	};

	$effect(() => {
		if (isNullish(rootElement) || isNullish(alignmentElement)) {
			return;
		}

		if (originalWidth === 0) {
			originalWidth = rootElement.clientWidth;
		}
		if (originalHeight === 0) {
			originalHeight = rootElement.children?.[0].clientHeight;
		}
	});
</script>

<svelte:window on:scroll={handleScroll} />

<div bind:this={rootElement} class="block" style={`height: ${originalHeight}px`}>
	<div
		class="z-9 duration-250 absolute block transition"
		bind:this={alignmentElement}
		class:bg-page={scrolledSoon || scrolledPast}
		class:fixed={scrolledPast}
		class:top-0={scrolledPast}
		class:pt-4={scrolledPast}
		style={`width: ${originalWidth}px`}
	>
		{@render children()}
	</div>
</div>
