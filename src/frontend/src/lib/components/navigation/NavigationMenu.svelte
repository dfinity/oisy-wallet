<script lang="ts">
	import InfoMenu from '$lib/components/navigation/InfoMenu.svelte';
	import NavigationMenuMainItems from '$lib/components/navigation/NavigationMenuMainItems.svelte';
	import { SIDEBAR_NAVIGATION_MENU } from '$lib/constants/test-ids.constants';
</script>

<div
<<<<<<< HEAD
	data-tid="navigation-menu-left"
	class="flex h-full w-full flex-col justify-between py-3 pl-4 md:pl-8"
=======
	class="flex h-full w-full flex-col justify-between overflow-auto py-3 pl-4 md:pl-8"
	data-tid={SIDEBAR_NAVIGATION_MENU}
>>>>>>> 3ad38d6d421008926a48a01d02b664e920963edd
>
	<div class="flex flex-col gap-3">
		<NavigationMenuMainItems />
	</div>

	<div class="my-4 flex h-full flex-col justify-center">
		<slot />
	</div>

	<InfoMenu />
</div>
