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

<div bind:this={rootElement} style={`height: ${originalHeight ?? 0}px`} class="relative">
	<!-- to avoid lower sticky headers to peek in front when using multiple, we add px-1 and add one SPACING_UNIT to the width below -->
	<!-- and whitespace-nowrap is needed to ensure when we first calc the height its the correct size which is given if no linebreaks -->
	<div
		class="sticky top-0 z-3 px-1 whitespace-nowrap"
		class:bg-page={scrolledSoon}
		class:pt-6={scrolledSoon}
	>
		{@render header()}
	</div>

	{@render children()}
</div>
