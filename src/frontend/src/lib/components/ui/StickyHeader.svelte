<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		header: Snippet;
		children: Snippet;
	}

	const { header, children }: Props = $props();

	const SPACING_UNIT = 4;
	const SPACING_TOP = SPACING_UNIT * 6; // since we add pt-6 we need to trigger earlier

	let rootElement = $state<HTMLElement | undefined>();

	let scrolledSoon = $state(false);

	const handleScroll = () => {
		if (isNullish(rootElement)) {
			return;
		}
		const rect = rootElement.getBoundingClientRect();
		scrolledSoon = rect.top <= SPACING_TOP * 4;
	};
</script>

<svelte:window onscroll={handleScroll} />

<div bind:this={rootElement}>
	<div
		class="sticky top-0 z-3 px-1 whitespace-nowrap"
		class:bg-page={scrolledSoon}
		class:pt-6={scrolledSoon}
	>
		{@render header()}
	</div>

	{@render children()}
</div>
