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
		class="mobile-nav visible fixed right-0 bottom-0 left-0 z-3 flex flex-row border-t-1 border-tertiary bg-primary-inverted-alt md:hidden"
		class:hidden={$bottomSheetOpenStore}
		data-tid={MOBILE_NAVIGATION_MENU}
	>
		{@render children()}
	</div>
</Responsive>
