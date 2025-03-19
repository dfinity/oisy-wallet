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
			// we need to use rem instead of px because the default tailwind values changed to rem,
			// and mixing units breaks custom screen definitions
			'1.5md': '56rem', // 896px
			'1.5lg': '72rem', // 1152px
			'1.5xl': '88rem', // 1408px
			'2.5xl': '108rem', // 1728px
			'h-md': { raw: '(max-height: 68rem)' } // ~1090px
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
				'trump-token-hero-image':
					'url(/images/trump-token-hero-image.webp), linear-gradient(to bottom, #232bcc, #000797)'
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
