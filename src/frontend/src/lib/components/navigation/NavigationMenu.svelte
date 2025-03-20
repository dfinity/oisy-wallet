<script lang="ts">
	import InfoMenu from '$lib/components/navigation/InfoMenu.svelte';
	import NavigationMenuMainItems from '$lib/components/navigation/NavigationMenuMainItems.svelte';
	import { SIDEBAR_NAVIGATION_MENU } from '$lib/constants/test-ids.constants';
</script>

<div
	class="flex h-full w-full flex-col justify-between overflow-auto py-3 pl-4 md:pl-8"
	data-tid={SIDEBAR_NAVIGATION_MENU}
>
	<div class="flex flex-col gap-3">
		<NavigationMenuMainItems />
	</div>

	<div class="my-4 flex h-full flex-col justify-center">
		<slot />
	</div>

	<InfoMenu />
</div>
