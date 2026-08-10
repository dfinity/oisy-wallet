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
	The pinned header masks the content underneath with blur alone, and
	deliberately paints no fill. The app background is a fixed artwork
	(`oisy_bg_light.webp`) whose base color is exactly
	`--color-background-page`, so the previous solid `bg-page` was
	invisible over the artwork's flat areas but stamped a hard-edged
	rectangle wherever one of its soft blobs sat underneath, worst on the
	`Assets` tab bar which pins on top of the upper-left blob. Any fill or
	color-shifting backdrop filter redraws that edge, since the step is
	proportional to how far the blob is from the base color. Blurring a
	smooth gradient is close to a no-op, so blur on its own leaves the
	artwork intact while still smearing the rows scrolling beneath.
-->
<div bind:this={rootElement}>
	<div
		style:z-index={zIndex}
		class="sticky top-0 px-1 whitespace-nowrap"
		class:backdrop-blur-xl={scrolledSoon}
		class:pt-6={scrolledSoon}
	>
		{@render header()}
	</div>

	{@render children()}
</div>
