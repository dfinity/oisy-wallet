<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type Snippet, onDestroy } from 'svelte';
	/*
	This component is meant to be used for cases where we want to display something for specific
	breakpoints without duplicating DOM elements.
	Usage: <Responsive up="xs" down="md">Content will be rendered between xs and md including xs and md</Responsive>
	*/

	import { run } from 'svelte/legacy';
	import { writable } from 'svelte/store';
	import {
		AVAILABLE_SCREENS,
		filterScreens,
		getActiveScreen,
		MAX_SCREEN,
		MIN_SCREEN,
		type ScreensKeyType,
		shouldDisplayForScreen
	} from '$lib/utils/screens.utils';

	interface Props {
		up?: ScreensKeyType;
		down?: ScreensKeyType;
		children?: Snippet;
	}

	let { up = MIN_SCREEN, down = MAX_SCREEN, children }: Props = $props();

	let innerWidth = $state(0);
	const debouncedWidth = writable(0);
	let timeoutHandle: NodeJS.Timeout | undefined = $state();

	run(() => {
		if (nonNullish(timeoutHandle)) {
			clearTimeout(timeoutHandle);
		}
		timeoutHandle = setTimeout(() => {
			debouncedWidth.set(innerWidth);
		}, 50); // debounce width on screen size change so we don't calculate all the time
	});

	let activeScreen: ScreensKeyType = $derived(
		getActiveScreen({
			screenWidth: $debouncedWidth,
			availableScreensSortedByWidth: AVAILABLE_SCREENS
		})
	);

	let display = $state(false);
	run(() => {
		display = shouldDisplayForScreen({
			filteredScreens: filterScreens({ availableScreens: AVAILABLE_SCREENS, up, down }),
			activeScreen
		});
	});

	onDestroy(() => {
		if (isNullish(timeoutHandle)) {
			return;
		}

		clearTimeout(timeoutHandle);
		timeoutHandle = undefined;
	});
</script>

<svelte:window bind:innerWidth />

{#if display}
	{@render children?.()}
{/if}
