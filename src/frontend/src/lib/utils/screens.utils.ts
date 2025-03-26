import { themeVariables } from '$lib/styles/tailwind/theme-variables';

export type ScreensKeyType = keyof typeof themeVariables.screens;
export interface AvailableScreen {
	screen: ScreensKeyType;
	width: number;
}

export const MIN_SCREEN: ScreensKeyType = 'xs';
export const MAX_SCREEN: ScreensKeyType = '2.5xl';

export const getAvailableScreens: () => AvailableScreen[] = () =>
	Object.entries(themeVariables.screens)
		.filter(([, v]) => typeof v === 'string') // warning is wrong since we have a custom element which is an object
		.map(([k, v]) => ({
			screen: k as ScreensKeyType,
			width: Number((v as string).replaceAll('rem', '')) * 16
		}))
		.sort((a, b) => a.width - b.width);

export const getActiveScreen = ({
	screenWidth,
	availableScreens
}: {
	screenWidth: number;
	availableScreens: AvailableScreen[];
}) => {
	for (const { width, screen } of availableScreens) {
		if (screenWidth < width) {
			return screen;
		}
	}
	// if nothing matches it must be the largest screen size
	return MAX_SCREEN;
};

export const filterScreens = ({
	availableScreens,
	up,
	down
}: {
	availableScreens: AvailableScreen[];
	up: ScreensKeyType;
	down: ScreensKeyType;
}) => {
	const upIndex = availableScreens.findIndex((screen) => screen.screen === up);
	const downIndex = availableScreens.findIndex((screen) => screen.screen === down);

	// If either key is invalid, return an empty array
	if (upIndex === -1 || downIndex === -1) {
		return [];
	}

	// Return the slice of screens between `up` and `down` inclusive
	return availableScreens.slice(upIndex, downIndex + 1).map((screen) => screen.screen);
};

export const shouldDisplayForScreen = ({
	filteredScreens,
	activeScreen
}: {
	filteredScreens: ScreensKeyType[];
	activeScreen: ScreensKeyType;
}) => filteredScreens.includes(activeScreen);
