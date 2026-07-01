<script lang="ts">
	import type { Snippet } from 'svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { MOBILE_NAVIGATION_MENU } from '$lib/constants/test-ids.constants';
	import { bottomSheetOpenStore } from '$lib/stores/ui.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<Responsive down="md">
	<div
		class="mobile-nav visible fixed right-0 bottom-0 left-0 z-12 md:hidden"
		class:hidden={$bottomSheetOpenStore}
		data-tid={MOBILE_NAVIGATION_MENU}
	>
		<!-- Bar background: the white shape rises into a hump around the center
		     cradle (SVG path taken from the design). Drawn behind the buttons and
		     extends above the 64px item row for the hump + drop-shadow. Sits on top
		     of the safe-area strip so the hump keeps its shape; the strip below is
		     filled separately (an SVG stretched into the inset would distort). -->
		<svg
			style="filter: drop-shadow(0 -3px 8px rgba(20, 30, 60, 0.1))"
			class="pointer-events-none absolute inset-x-0 bottom-[env(safe-area-inset-bottom)] -z-[1] h-[100px] w-full"
			fill="none"
			preserveAspectRatio="none"
			viewBox="0 0 300 100"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M0,36 L60,36 C92,36 119.2,35.6 132,26 A30,30 0 0 1 168,26 C180.8,35.6 208,36 240,36 L300,36 L300,100 L0,100 Z"
				fill="var(--color-background-primary-inverted-alt)"
			/>
			<path
				d="M0,36 L60,36 C92,36 119.2,35.6 132,26 A30,30 0 0 1 168,26 C180.8,35.6 208,36 240,36 L300,36"
				fill="none"
				stroke="var(--color-border-tertiary)"
				stroke-width="1"
				vector-effect="non-scaling-stroke"
			/>
		</svg>
		<!-- Extend the white down through the iOS home-indicator inset so the bar
		     doesn't float above the page background on devices with a safe area. -->
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 -z-[1] h-[env(safe-area-inset-bottom)] bg-[var(--color-background-primary-inverted-alt)]"
		></div>
		<div class="flex h-16 flex-row items-end pb-[env(safe-area-inset-bottom)]">
			{@render children()}
		</div>
	</div>
</Responsive>
