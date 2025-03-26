<script lang="ts">
	import { onDestroy } from 'svelte';
	import { nonNullish } from '@dfinity/utils';
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

	let innerWidth: number;
	$: innerWidth = 0;

	let debouncedWidth: number;
	$: debouncedWidth = 0;
	let timeoutHandle: ReturnType<typeof setTimeout>;

	$: {
		if (nonNullish(timeoutHandle)) {
			clearTimeout(timeoutHandle);
		}
		timeoutHandle = setTimeout(() => {
			debouncedWidth = innerWidth;
		}, 50); // debounce width on screen size change so we dont calculate all the time
	}

	let screens: AvailableScreen[];
	$: screens = getAvailableScreens();

	let activeScreen: ScreensKeyType;
	$: activeScreen = getActiveScreen({ screenWidth: debouncedWidth, availableScreens: screens });

	let display = false;
	$: display = shouldDisplayForScreen({
		filteredScreens: filterScreens({ availableScreens: screens, up, down }),
		activeScreen
	});

	onDestroy(() => {
		if (nonNullish(timeoutHandle)) {
			clearTimeout(timeoutHandle);
		}
	});
</script>

<svelte:window bind:innerWidth />

{#if display}
	<slot />
{/if}
