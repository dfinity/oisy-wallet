import type { ALL_SCREENS } from '$lib/constants/screens.constants';

export type ScreensKeyType = keyof typeof ALL_SCREENS;

export interface AvailableScreen {
	screen: ScreensKeyType;
	width: number;
}
