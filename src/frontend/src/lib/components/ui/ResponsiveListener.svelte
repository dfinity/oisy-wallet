<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { screensStore } from '$lib/stores/screens.store';
	import { AVAILABLE_SCREENS, getActiveScreen } from '$lib/utils/screens.utils';

	let innerWidth = $state(0);

	const updateWidth = () => {
		const activeScreen = getActiveScreen({
			screenWidth: innerWidth,
			availableScreensSortedByWidth: AVAILABLE_SCREENS
		});

		screensStore.set(activeScreen);
	};

	const debounceUpdateWidth = debounce(updateWidth);

	$effect(() => {
		[innerWidth];

		untrack(() => debounceUpdateWidth());
	});
</script>

<svelte:window bind:innerWidth />
