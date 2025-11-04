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

	function keepNavPinned() {
		const nav = document.querySelector('.mobile-nav');
		if (!nav || !window.visualViewport) return;

		const viewport = window.visualViewport;
		offset = window.innerHeight - (viewport.height + viewport.offsetTop);
	}

	window.visualViewport?.addEventListener('resize', keepNavPinned);
	window.visualViewport?.addEventListener('scroll', keepNavPinned);
	keepNavPinned();
</script>

<Responsive down="md">
	<div
		style="transform: translateY(-{offset}px);"
		class="mobile-nav-wrapper visible fixed right-0 bottom-0 left-0 z-3 flex flex-row border-t-1 border-tertiary bg-primary-inverted-alt md:hidden"
		class:hidden={$bottomSheetOpenStore}
	>
		<div class="mobile-nav flex flex-row" data-tid={MOBILE_NAVIGATION_MENU}>
			{@render children()}
		</div>
	</div>
</Responsive>
