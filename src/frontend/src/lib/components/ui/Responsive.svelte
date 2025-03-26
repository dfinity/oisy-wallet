<script lang="ts">
	import {
		type AvailableScreen,
		filterScreens,
		getActiveScreen,
		getAvailableScreens,
		MAX_SCREEN,
		MIN_SCREEN,
		type ScreensKeyType,
		shouldDisplayForScreen
	} from '$lib/utils/screens.utils';

	export let up: ScreensKeyType = MIN_SCREEN;
	export let down: ScreensKeyType = MAX_SCREEN;

	$: innerWidth = 0;

	let screens: AvailableScreen[];
	$: screens = getAvailableScreens();

	let activeScreen: ScreensKeyType;
	$: activeScreen = getActiveScreen({ screenWidth: innerWidth, availableScreens: screens });

	let display = false;
	$: display = shouldDisplayForScreen({
		filteredScreens: filterScreens({ availableScreens: screens, up, down }),
		activeScreen
	});
</script>

<svelte:window bind:innerWidth />

{#if display}
	<slot />
{/if}
