<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		header: Snippet;
		children: Snippet;
		// Optional stacking-context override. Defaults to `z-3` to match the
		// historical behavior shared by every sticky header in the app. Pass
		// `10` for headers whose contents open a popover that must paint above
		// other sibling sticky headers (also at `z-3`) rendered later in the
		// DOM — see `AllTransactionsList`.
		zIndex?: 3 | 10;
	}

	const { header, children, zIndex = 3 }: Props = $props();

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
		class="sticky top-0 px-1 whitespace-nowrap"
		class:bg-page={scrolledSoon}
		class:pt-6={scrolledSoon}
		class:z-10={zIndex === 10}
		class:z-3={zIndex === 3}
	>
		{@render header()}
	</div>

	{@render children()}
</div>
