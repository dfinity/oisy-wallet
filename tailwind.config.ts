import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import { themeVariables } from './src/frontend/src/lib/styles/tailwind/theme-variables';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		fontFamily: {
			sans: ['CircularXX', 'sans-serif', ...defaultTheme.fontFamily.sans]
		},
		screens: {
			...defaultTheme.screens,
			...themeVariables.screens
		},
		colors: {
			// base colors, can be left in
			inherit: 'inherit',
			transparent: 'transparent',
			current: 'currentColor',
			black: 'rgb(0, 0, 0)',
			white: 'rgb(255 255 255)',

			// keeping off-white since there's currently no matching color var in figma even though its used
			'off-white': '#fcfaf6',

			// custom hero gradient colors
			...themeVariables.gradient
		},
		extend: {
			backgroundColor: themeVariables.background,
			gradientColorStops: themeVariables.background,
			borderColor: themeVariables.border,
			ringColor: themeVariables.border,
			textColor: themeVariables.foreground,
			backgroundImage: {
				'icp-token-hero-gradient':
					'linear-gradient(to bottom, var(--color-background-icp-gradient-0), var(--color-background-icp-gradient-100))',
				'trump-token-hero-image':
					'url(/images/trump-token-hero-image.webp), linear-gradient(to bottom, #232bcc, #000797)',
				'vchf-token-hero-image':
					'url(/images/vchf-token-hero-image.webp), radial-gradient(#DA291C, #AD1207)',
				'veur-token-hero-image':
					'url(/images/veur-token-hero-image.webp), linear-gradient(180deg, #00319E, #00319E)',
				'usd1-token-hero-image':
					'url(/images/usd1-token-hero-image.webp), linear-gradient(160deg, #0F1A30, #05070E)'
			},
			backgroundSize: {
				'size-200': '200% 200%'
			},
			backgroundPosition: {
				'pos-0': '0% 0%',
				'pos-100': '100% 100%'
			},
			width: {
				sm: '576px',
				md: '768px'
			}
		}
	},
	plugins: []
} satisfies Config;
