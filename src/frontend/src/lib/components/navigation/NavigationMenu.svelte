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
	<div class="mb-6 flex flex-col gap-3">
		<NavigationMenuMainItems />
	</div>

	<div class="my-4 flex h-full flex-col">
		{@render children()}
	</div>
</div>
