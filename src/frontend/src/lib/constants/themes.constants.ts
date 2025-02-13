import { SystemTheme } from '$lib/enums/themes';
import { Theme } from '@dfinity/gix-components';

export const THEME_VALUES = [...Object.values(Theme), ...Object.values(SystemTheme)];

// TODO: use variable exposed from gix-components when it will be exposed.
export const THEME_KEY = 'nnsTheme';
