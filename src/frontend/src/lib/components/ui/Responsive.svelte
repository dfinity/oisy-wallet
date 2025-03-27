<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import { writable } from 'svelte/store';
	import {
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

	let innerWidth = 0;
	let debouncedWidth = writable(0);
	let timeoutHandle: ReturnType<typeof setTimeout>;

	$: {
		if (nonNullish(timeoutHandle)) {
			clearTimeout(timeoutHandle);
		}
		timeoutHandle = setTimeout(() => {
			debouncedWidth.set(innerWidth);
		}, 50); // debounce width on screen size change so we don't calculate all the time
	}

	const screens = getAvailableScreens();

	let activeScreen: ScreensKeyType;
	$: activeScreen = getActiveScreen({
		screenWidth: $debouncedWidth,
		availableScreensSortedByWidth: screens
	});

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
