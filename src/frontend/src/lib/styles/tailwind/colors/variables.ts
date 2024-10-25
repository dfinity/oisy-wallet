import { themeDefault } from '$lib/styles/tailwind/colors/theme-default';

export const themeVariables = {
	foreground: {
		'brand-primary': themeDefault.brand.base,
		'brand-secondary': themeDefault.brand[500],
		warning: themeDefault.warning.default
	},
	background: {
		'brand-primary': themeDefault.brand.base
	}
};
