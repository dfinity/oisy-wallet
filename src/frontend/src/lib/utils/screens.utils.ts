import { themeVariables } from '$lib/styles/tailwind/theme-variables';

export type ScreensKeyType = keyof typeof themeVariables.screens;
export interface AvailableScreen {
	screen: ScreensKeyType;
	width: number;
}

export const MIN_SCREEN: ScreensKeyType = 'xs';
export const MAX_SCREEN: ScreensKeyType = '2.5xl';

export const AVAILABLE_SCREENS: AvailableScreen[] = Object.entries(themeVariables.screens)
	.reduce<AvailableScreen[]>((acc, [k, v]) => {
		return [
			...acc,
			...(typeof v === 'string'
				? [
						{
							screen: k as ScreensKeyType,
							width: Number(v.replaceAll('rem', '')) * 16
						}
					]
				: [])
		];
	}, [])
	.sort((a, b) => a.width - b.width);

export const getActiveScreen = ({
	screenWidth,
	availableScreensSortedByWidth
}: {
	screenWidth: number;
	availableScreensSortedByWidth: AvailableScreen[];
}) => availableScreensSortedByWidth.find(({ width }) => screenWidth < width)?.screen ?? MAX_SCREEN;

export const filterScreens = ({
	availableScreens,
	up,
	down
}: {
	availableScreens: AvailableScreen[];
	up: ScreensKeyType;
	down: ScreensKeyType;
}) => {
	const filteredScreens = availableScreens.reduce(
		(acc, screen) => {
			// If `up` is found, start collecting screens
			if (screen.screen === up) {
				acc.foundUp = true;
			}

			// Collect the screen if `up` has been found but not `down` yet
			if (acc.foundUp && !acc.foundDown) {
				acc.result.push(screen.screen);
			}

			// If `down` is found after `up`, stop collecting screens
			if (screen.screen === down && acc.foundUp) {
				acc.foundDown = true;
			}

			return acc;
		},
		{ result: [] as ScreensKeyType[], foundUp: false, foundDown: false }
	);

	// If either `up` or `down` is not found, return an empty array
	if (!filteredScreens.foundUp || !filteredScreens.foundDown) {
		return [];
	}

	// Return the collected screens between `up` and `down` (inclusive)
	return filteredScreens.result;
};

export const shouldDisplayForScreen = ({
	filteredScreens,
	activeScreen
}: {
	filteredScreens: ScreensKeyType[];
	activeScreen: ScreensKeyType;
}) => filteredScreens.includes(activeScreen);
