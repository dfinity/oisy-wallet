<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		header: Snippet;
		children: Snippet;
		// Optional stacking-context override. Defaults to `3` to match the
		// historical behavior shared by every sticky header in the app
		// (date stickies, `Assets`, `TokensList`). Pass a higher value for
		// headers whose contents open a popover that must paint above
		// other sibling sticky headers.
		zIndex?: number;
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

<!--
	The pinned fill is frosted rather than solid. The app background is a
	fixed artwork (`oisy_bg_light.webp`) whose base color is exactly
	`--color-background-page`, so a solid `bg-page` was invisible over the
	flat areas but stamped a hard-edged rectangle over the artwork's
	blobs. It shows worst on the `Assets` tab bar, which pins right on top
	of the upper-left blob. A translucent fill plus `backdrop-blur` still
	masks the content scrolling underneath while letting the artwork
	through. Same treatment as the lock screen (see `LockPage`).
-->
<div bind:this={rootElement}>
	<div
		style:z-index={zIndex}
		class="sticky top-0 px-1 whitespace-nowrap"
		class:backdrop-blur-md={scrolledSoon}
		class:bg-overlay-page-30={scrolledSoon}
		class:pt-6={scrolledSoon}
	>
		{@render header()}
	</div>

	{@render children()}
</div>
