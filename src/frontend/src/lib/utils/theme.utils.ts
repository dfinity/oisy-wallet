import { Theme } from '$lib/types/theme';
import { enumFromStringExists } from '$lib/utils/enum.utils';
import { isNode } from '$lib/utils/env.utils';
import { notEmptyString } from '@dfinity/utils';

export const THEME_ATTRIBUTE = 'theme';
export const LOCALSTORAGE_THEME_KEY = 'nnsTheme';

export const initTheme = (): Theme | undefined => {
	// No DOM therefore cannot guess the theme
	if (isNode()) {
		return undefined;
	}

	const theme: string | null = document.documentElement.getAttribute(THEME_ATTRIBUTE);

	const initialTheme: Theme = enumFromStringExists({
		obj: Theme,
		value: theme
	})
		? (theme as Theme)
		: Theme.DARK;

	applyTheme({ theme: initialTheme, preserve: false });

	return initialTheme;
};

export const applyTheme = ({ theme, preserve = true }: { theme: Theme; preserve?: boolean }) => {
	const { documentElement, head } = document;

	documentElement.setAttribute(THEME_ATTRIBUTE, theme);

	const color: string = getComputedStyle(documentElement).getPropertyValue('--theme-color');

	// Update theme-color for mobile devices to customize the display of the page or of the surrounding user interface
	// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name/theme-color
	head?.children?.namedItem('theme-color')?.setAttribute('content', color.trim());

	if (preserve) {
		localStorage.setItem(LOCALSTORAGE_THEME_KEY, JSON.stringify(theme));
	}
};

export const getThemeFromSystemSettings = (): Theme => {
	const isDarkPreferred = window.matchMedia('(prefers-color-scheme: dark)').matches;

	return isDarkPreferred ? Theme.DARK : Theme.LIGHT;
};

export const resetTheme = (theme: Theme) => {
	localStorage.removeItem(LOCALSTORAGE_THEME_KEY);

	applyTheme({ theme, preserve: false });
};

export const isThemeSelected = (): boolean =>
	notEmptyString(localStorage.getItem(LOCALSTORAGE_THEME_KEY));
