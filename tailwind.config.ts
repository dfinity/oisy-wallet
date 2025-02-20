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
			// default viewports
			sm: '640px',
			md: '768px',
			lg: '1024px',
			xl: '1280px',
			'2xl': '1536px',
			// custom viewports
			'1.5md': '896px',
			'1.5lg': '1152px',
			'1.5xl': '1408px',
			'2.5xl': '1728px',
			'h-md': { raw: '(max-height: 1090px)' }
		},
		colors: {
			// base colors, can be left in
			inherit: 'inherit',
			transparent: 'transparent',
			current: 'currentColor',
			black: 'rgb(0, 0, 0)',
			white: 'rgb(255 255 255)',

			// todo: remove refereces to these hardcoded colors!
			'off-white': '#fcfaf6',
			dust: '#dbd9d6',
			grey: '#c0bbc4',
			'blue-ribbon': '#0066ff',
			'info-blue': '#0BA5EC',
			goldenrod: '#dfa81b',
			cyclamen: '#ea6c99',

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
