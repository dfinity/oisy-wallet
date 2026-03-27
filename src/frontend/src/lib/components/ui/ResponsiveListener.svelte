<script lang="ts">
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

	$effect(() => {
		[innerWidth];

		untrack(() => updateWidth());
	});
</script>

<svelte:window bind:innerWidth />
