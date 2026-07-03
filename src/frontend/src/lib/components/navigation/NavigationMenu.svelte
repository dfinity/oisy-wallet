<script lang="ts">
	import type { Snippet } from 'svelte';
	import NavigationMenuMainItems from '$lib/components/navigation/NavigationMenuMainItems.svelte';
	import { SIDEBAR_NAVIGATION_MENU } from '$lib/constants/test-ids.constants';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div
	class="flex h-full w-full flex-col justify-between overflow-auto py-3 pl-4 md:pl-8"
	data-tid={SIDEBAR_NAVIGATION_MENU}
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
