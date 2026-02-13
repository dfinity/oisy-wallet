<script lang="ts">
	/*
	This component is meant to be used for cases where we want to display something for specific
	breakpoints without duplicating DOM elements.
	Usage: <Responsive up="xs" down="md">Content will be rendered between xs and md including xs and md</Responsive>
	*/

	import type { Snippet } from 'svelte';
	import { screensStore } from '$lib/stores/screens.store';
	import type { ScreensKeyType } from '$lib/types/screens';
	import {
		AVAILABLE_SCREENS,
		filterScreens,
		MAX_SCREEN,
		MIN_SCREEN,
		shouldDisplayForScreen
	} from '$lib/utils/screens.utils';

	interface Props {
		up?: ScreensKeyType;
		down?: ScreensKeyType;
		children: Snippet;
	}

	let { up = MIN_SCREEN, down = MAX_SCREEN, children }: Props = $props();

	let display = $derived(
		shouldDisplayForScreen({
			filteredScreens: filterScreens({ availableScreens: AVAILABLE_SCREENS, up, down }),
			activeScreen: $screensStore
		})
	);
</script>

{#if display}
	{@render children()}
{/if}
