<script lang="ts">
	import type { Snippet } from 'svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { MOBILE_NAVIGATION_MENU } from '$lib/constants/test-ids.constants';
	import { bottomSheetOpenStore } from '$lib/stores/ui.store';

	interface Props {
		children: Snippet;
	}
	let { children }: Props = $props();

	let offset = $state(0);
	let raf: number | null = null;

	function updateOffset() {
		if (!window.visualViewport) return;
		const vv = window.visualViewport;
		const diff = window.innerHeight - (vv.height + vv.offsetTop);
		offset = Math.max(0, diff);
	}

	function scheduleUpdate() {
		if (raf) cancelAnimationFrame(raf);
		raf = requestAnimationFrame(updateOffset);
	}

	onMount(() => {
		const vv = window.visualViewport;
		if (vv) {
			vv.addEventListener('resize', scheduleUpdate);
			vv.addEventListener('scroll', scheduleUpdate);
		}
		window.addEventListener('orientationchange', scheduleUpdate);
		updateOffset();

		return () => {
			if (vv) {
				vv.removeEventListener('resize', scheduleUpdate);
				vv.removeEventListener('scroll', scheduleUpdate);
			}
			window.removeEventListener('orientationchange', scheduleUpdate);
			if (raf) cancelAnimationFrame(raf);
		};
	});
</script>

<Responsive down="md">
	<div
		style="transform: translateY({offset}px);"
		class="mobile-nav-wrapper visible fixed right-0 bottom-0 left-0 z-3 flex flex-row border-t-1 border-tertiary bg-primary-inverted-alt md:hidden"
		class:hidden={$bottomSheetOpenStore}
	>
		<div class="mobile-nav flex flex-row" data-tid={MOBILE_NAVIGATION_MENU}>
			{@render children()}
		</div>
	</div>
</Responsive>
