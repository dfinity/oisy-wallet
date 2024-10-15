import { fontFamily } from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
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
			'black-rgb': '0, 0, 0',
			white: 'rgb(255 255 255)',
			'white-rgb': '255, 255, 255',
			'off-white': '#fcfaf6',
			dust: '#dbd9d6',
			grey: '#c0bbc4',
			'light-grey': '#ced4da',
			'light-blue': '#e8f1ff',
			blue: '#3b00b9',
			'blue-ribbon-rgb': '0, 102, 255',
			'blue-ribbon': '#0066ff',
			'dark-blue': '#321469',
			'brandeis-blue': '#016dfc',
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
			'mountain-meadow': '#30af91',
			'green-crayola': '#16b364',
			'british-racing-green': '#084c2e',
			'dartmouth-green': '#087443',
			'rusty-red': '#dc3545',
			'chocolate-cosmos': '#520c13',
			'upsdell-red': '#a71d2a',
			'alice-blue': '#ecf3fb',
			'american-orange': '#ff8a00',
			'crayola-yellow': '#ffe57f',
			cornsilk: '#fff7d8',
			cobalt: '#004abe',
			'resolution-blue': '#012f80',
			zumthor: '#e8f1ff',
			onahau: '#d1e3ff',
			anakiwa: '#b0cdff',
			beer: '#f7931a',
			fulvous: '#de7900',
			water: '#d1e3ff',
			// New theming from: https://www.figma.com/design/dUNegIE5geiWu7916IC07c/6.-OISY---Theme-library?node-id=2104-6773&node-type=instance&m=dev
			foreground: {
				primary: 'var(--foreground-primary)',
				'brand-primary': 'var(--color-brand-base)',
				'primary-inverted': 'var(--foreground-primary-inverted)',
				info: 'var(--color-info-default)',
				'info-alt': 'var(--color-info-light)',
				success: 'var(--color-success-default)',
				'success-alt': 'var(--color-success-light)',
				warning: 'var(--color-warning-default)',
				'warning-alt': 'var(--color-warning-light)',
				error: 'var(--color-error-default)',
				'error-alt': 'var(--color-error-light)',
				secondary: 'var(--foreground-secondary)',
				tertiary: 'var(--foreground-tertiary)',
				'secondary-inverted': 'var(--foreground-secondary-inverted)',
				'tertiary-inverted': 'var(--foreground-tertiary-inverted)',
				'brand-secondary': 'var(--color-brand-500)',
				disabled: 'var(--foreground-disabled)'
			},
			background: {
				primary: 'var(--background-primary)',
				secondary: 'var(--background-secondary)',
				tertiary: 'var(--background-tertiary)',
				'primary-inverted': 'var(--background-primary-inverted)',
				'secondary-inverted': 'var(--background-secondary-inverted)',
				'tertiary-inverted': 'var(--background-tertiary-inverted)',
				disabled: 'var(--background-disabled)',
				'brand-primary': 'var(--color-brand-base)',
				'brand-secondary': 'var(--color-brand-500)',
				'brand-tertiary': 'var(--color-brand-600)',
				'brand-subtle': 'var(--color-brand-100)',
				'brand-subtle-alt': 'var(--color-brand-200)',
				'brand-subtle2-alt': 'var(--color-brand-300)',
				info: 'var(--color-info-default)',
				'info-alt': 'var(--color-info-light)',
				'success-subtle': 'var(--color-success-lightest)',
				'success-subtle-alt': 'var(--color-success-lighter)',
				'warning-subtle': 'var(--color-warning-lightest)',
				'warning-subtle-alt': 'var(--color-warning-lighter)',
				'error-subtle': 'var(--color-error-lightest)',
				'error-subtle-alt': 'var(--color-error-lighter)',
				'brand-disabled': 'var(--color-brand-100)',
				page: 'var(--background-page)'
			},
			border: {
				primary: 'var(--border-primary)',
				secondary: 'var(--border-secondary)',
				tertiary: 'var(--border-tertiary)',
				'primary-inverted': 'var(--border-primary-inverted)',
				'secondary-inverted': 'var(--border-secondary-inverted)',
				'tertiary-inverted': 'var(--border-tertiary-inverted)',
				disabled: 'var(--border-disabled)',
				'brand-subtle': 'var(--color-brand-100)',
				'brand-subtle-alt': 'var(--color-brand-200)',
				'brand-subtle2-alt': 'var(--color-brand-300)',
				'brand-primary': 'var(--color-brand-base)',
				'brand-secondary': 'var(--color-brand-500)',
				'brand-tertiary': 'var(--color-brand-600)'
			}
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
				sm: '576px'
			},
			screens: {
				'2.5xl': '1728px',
				'h-md': { raw: '(max-height: 1090px)' }
			}
		}
	},
	plugins: []
};
