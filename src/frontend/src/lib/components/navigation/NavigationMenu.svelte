<script lang="ts">
	import type { Snippet } from 'svelte';
	import NavigationMenuMainItems from '$lib/components/navigation/NavigationMenuMainItems.svelte';
	import {
		SIDEBAR_NAVIGATION_MENU,
		SIDEBAR_NAVIGATION_MENU_BOTTOM,
		SIDEBAR_NAVIGATION_MENU_SCROLL
	} from '$lib/constants/test-ids.constants';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<!--
	Two regions stacked in one column. The sections and the lower slot scroll;
	Settings and the More menu are pinned beneath them. They used to sit in the
	page footer, which is `position: fixed` and knows nothing about this column —
	so in a short window it landed on top of it, Settings flush under Rewards and
	More over the dApp card. Inside the same column nothing can overlap: the top
	region shrinks and scrolls, the bottom one keeps its height.
-->
<div class="flex h-full w-full flex-col py-3 pl-4 md:pl-8" data-tid={SIDEBAR_NAVIGATION_MENU}>
	<!-- `min-h-0` is what lets it shrink below its content and scroll, rather than
	     push the pinned block out of the column: a flex child's minimum height
	     defaults to its content. -->
	<div
		class="flex min-h-0 flex-1 flex-col justify-between overflow-auto"
		data-tid={SIDEBAR_NAVIGATION_MENU_SCROLL}
	>
		<!-- Condensed desktop list: tight 2px gaps and ~40px rows ([&_.nav-item]:py-2),
		     matching the design; mobile is unaffected (it uses MobileNavigationMenu).
		     Icons are forced to a uniform 24px box ([&_.nav-item_svg]) since icon
		     components have differing size defaults (e.g. IconLineChart defaults to
		     16), and items-center keeps the icon vertically centred against the
		     label regardless of the icon's own intrinsic height. -->
		<div
			class="mb-6 flex flex-col gap-0.5 [&_.nav-item]:items-center [&_.nav-item]:py-2 [&_.nav-item_svg]:h-6 [&_.nav-item_svg]:w-6"
		>
			<NavigationMenuMainItems />
		</div>

		<div class="my-4 flex h-full flex-col">
			{@render children()}
		</div>
	</div>

	<!-- `pt-3`: the same gap that separates the sections above from each other.
	     No test-id prefix, so Settings keeps `navigation-item-settings`, the id
	     both e2e page objects navigate by. -->
	<div class="shrink-0 pt-3" data-tid={SIDEBAR_NAVIGATION_MENU_BOTTOM}>
		<NavigationMenuMainItems layout="bottom" />
	</div>
</div>
