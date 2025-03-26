<script lang="ts">
	import { themeVariables } from '$lib/styles/tailwind/theme-variables';

	type ScreensKeyType = keyof typeof themeVariables.screens;

	const MIN_SCREEN: ScreensKeyType = 'xs';
	const MAX_SCREEN: ScreensKeyType = '2.5xl';

	export let up: ScreensKeyType = MIN_SCREEN;
	export let down: ScreensKeyType = MAX_SCREEN;

	$: innerWidth = 0;

	let screens: { screen: ScreensKeyType; width: number }[];
	$: screens = ((os) => {
		return Object.entries(os)
			.filter(([, v]) => typeof v === 'string') // warning is wrong since we have a custom element which is an object
			.map(([k, v]) => {
				console.log(v, typeof v);
				return {
					screen: k as ScreensKeyType,
					width: Number((v as string).replaceAll('rem', '')) * 16
				};
			})
			.sort((a, b) => a.width - b.width);
	})(themeVariables.screens);

	const getActiveScreen = (w: number) => {
		for (const { width, screen } of screens) {
			if (w < width) {
				return screen;
			}
		}
		return MAX_SCREEN;
	};

	let activeScreen: ScreensKeyType;
	$: activeScreen = getActiveScreen(innerWidth);

	const getBreakpoints = () => {
		const upIndex = screens.findIndex((screen) => screen.screen === up);
		const downIndex = screens.findIndex((screen) => screen.screen === down);

		// If either key is invalid, return an empty array
		if (upIndex === -1 || downIndex === -1) {
			return [];
		}

		// Return the slice of screens between `up` and `down` inclusive
		return screens.slice(upIndex, downIndex + 1).map((screen) => screen.screen);
	};
</script>

<svelte:window bind:innerWidth />

{#if getBreakpoints().includes(activeScreen)}
	<slot />
{/if}
