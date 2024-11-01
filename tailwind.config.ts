import { fontFamily } from 'tailwindcss/defaultTheme';
import type { Config } from 'tailwindcss/types/config';
import { themeVariables } from './src/frontend/src/lib/styles/tailwind/theme-variables';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		fontFamily: {
			sans: ['CircularXX', 'sans-serif', ...fontFamily.sans]
		},
		colors: {
			inherit: 'inherit',
			transparent: 'transparent',
			current: 'currentColor',
			black: 'rgb(0, 0, 0)',
			'black-rgb': '0, 0, 0',
			white: 'rgb(255 255 255)',
			'white-rgb': '255, 255, 255',
			'ghost-white': '#f8f9fa',
			'off-white': '#fcfaf6',
			dust: '#dbd9d6',
			grey: '#c0bbc4',
			'light-grey': '#ced4da',
			aurometalsaurus: '#6c757d',
			'blue-ribbon-rgb': '0, 102, 255',
			'blue-ribbon': '#0066ff',
			'info-blue': '#0BA5EC',
			'dark-blue': '#321469',
			'absolute-blue': '#004eb5',
			'interdimensional-blue': '#3b00b9',
			'united-nations-blue': '#627eea',
			'pale-cornflower-blue': '#b0cdff',
			'brilliant-azure': '#348afd',
			'misty-rose': '#937993',
			'chinese-purple': '#7014a4',
			goldenrod: '#dfa81b',
			cyclamen: '#ea6c99',
			'bright-lilac': '#e18dff',
			'green-crayola': '#16b364',
			'british-racing-green': '#084c2e',
			'dartmouth-green': '#087443',
			'rusty-red': '#dc3545',
			'chocolate-cosmos': '#520c13',
			'upsdell-red': '#a71d2a',
			'alice-blue': '#ecf3fb',
			'american-orange': '#ff8a00',
			'crayola-yellow': '#ffe57f',
			'warning-orange': '#FFF3E6',
			cornsilk: '#fff7d8',
			cobalt: '#004abe',
			zumthor: '#e8f1ff',
			beer: '#f7931a',
			fulvous: '#de7900',
			...themeVariables
		},
		extend: {
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
			},
			screens: {
				'1.5md': '896px',
				'1.5lg': '1152px',
				'1.5xl': '1408px',
				'2.5xl': '1728px',
				'h-md': { raw: '(max-height: 1090px)' }
			}
		}
	},
	plugins: []
} satisfies Config;
