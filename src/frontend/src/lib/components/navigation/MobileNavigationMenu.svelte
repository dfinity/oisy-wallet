<script lang="ts">
	import type { Snippet } from 'svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { MOBILE_NAVIGATION_MENU } from '$lib/constants/test-ids.constants';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<Responsive down="md">
	<div
		class="mobile-nav-wrapper visible z-3 border-t-1 border-tertiary bg-primary-inverted-alt md:hidden"
	>
		<div class="mobile-nav flex flex-row" data-tid={MOBILE_NAVIGATION_MENU}>
			{@render children()}
		</div>
	</div>
</Responsive>
