import { themeVariables } from '$lib/styles/tailwind/theme-variables';
import defaultTheme from 'tailwindcss/defaultTheme';

export const ALL_SCREENS = { ...defaultTheme.screens, ...themeVariables.screens };
