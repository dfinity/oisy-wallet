import { fontFamily } from 'tailwindcss/defaultTheme';

/**
 * This function (tw plugin) is used to automatically add css variables for all colors defined in the tailwind theme.
 * This allows us to: define a color (like brand.500) in the theme, and reference it in semantic definitions.
 * @param addBase where the :root attribute with var definitions is appended
 * @param theme that is processed
 */
function addCSSVariablesForColors({ addBase, theme }) {
	function extractColorVars(colorObj, colorGroup = '') {
		return Object.keys(colorObj).reduce((vars, colorKey) => {
			const value = colorObj[colorKey];
			const cssVariable =
				colorKey === 'DEFAULT' ? `--color${colorGroup}` : `--color${colorGroup}-${colorKey}`;

			const newVars =
				typeof value === 'string'
					? { [cssVariable]: value }
					: extractColorVars(value, `-${colorKey}`);

			return { ...vars, ...newVars };
		}, {});
	}

	addBase({
		':root': extractColorVars(theme('colors'))
	});
}

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
			brand: {
				100: '#e8f1ff',
				200: '#d1e3ff',
				300: '#b0cdff',
				400: '#84b2ff',
				base: '#0066ff',
				DEFAULT: '#004abe',
				500: '#004abe',
				600: '#012f80'
			},
			warning: {
				lightest: '#fff3e6',
				lighter: '#ffd099',
				light: '#feb967',
				DEFAULT: '#ff8a00',
				dark: '#cc6e00',
				darker: '#663701'
			},
			error: {
				lightest: '#fff6f6',
				lighter: '#fadfdf',
				light: '#f5a9b8',
				DEFAULT: '#dc3545',
				dark: '#a71d2a',
				darker: '#520c13'
			},
			info: {
				lightest: '#f0f9ff',
				lighter: '#e0f2fe',
				light: '#7cd4fd',
				DEFAULT: '#0ba5ec',
				dark: '#026aa2',
				darker: '#0b4a6f'
			},
			success: {
				lightest: '#d0f0e0',
				lighter: '#a2e1c1',
				light: '#73d1a2',
				DEFAULT: '#16b364',
				dark: '#087443',
				darker: '#084c2e'
			},
			neutral: {
				black: '#000000',
				'black-50': '#00000080',
				white: '#ffffff',
				'white-50': '#ffffff80',
				100: '#f8f9fa',
				200: '#e9ecef',
				300: '#dee2e6',
				400: '#ced4da',
				500: '#adb5bd',
				600: '#6c757d',
				700: '#495057',
				800: '#343a40',
				900: '#212529'
			},
			alpha: {
				10: '#ffffff1a',
				30: '#ffffff4d',
				50: '#ffffff80',
				70: '#ffffffb2',
				90: '#ffffffe5'
			},
			'alpha-inverted': {
				10: '#0000001a',
				30: '#00000033',
				50: '#00000080',
				70: '#000000b2',
				90: '#000000e5'
			},
			// Mapping colors to semantic codes
			foreground: {
				primary: 'var(--color-neutral-black)',
				secondary: 'var(--color-neutral-900)',
				tertiary: 'var(--color-neutral-600)',
				'primary-inverted': 'var(--color-neutral-white)',
				'secondary-inverted': 'var(--color-neutral-200)',
				'tertiary-inverted': 'var(--color-neutral-500)',
				disabled: 'var(--color-neutral-400)',
				'brand-primary': 'var(--color-brand-base)',
				info: 'var(--color-info)',
				'info-alt': 'var(--color-info-light)',
				success: 'var(--color-success)',
				'success-alt': 'var(--color-success-light)',
				warning: 'var(--color-warning)',
				'warning-alt': 'var(--color-warning-light)',
				error: 'var(--color-error)',
				'error-alt': 'var(--color-error-light)',
				'brand-secondary': 'var(--color-brand-500)'
			},
			background: {
				page: 'var(--color-neutral-white)',
				primary: 'var(--color-neutral-white)',
				secondary: 'var(--color-neutral-100)',
				tertiary: 'var(--color-neutral-200)',
				'primary-inverted': 'var(--color-neutral-black)',
				'secondary-inverted': 'var(--color-neutral-900)',
				'tertiary-inverted': 'var(--color-neutral-600)',
				disabled: 'var(--color-neutral-300)',
				'brand-primary': 'var(--color-brand-base)',
				'brand-secondary': 'var(--color-brand-500)',
				'brand-tertiary': 'var(--color-brand-600)',
				'brand-subtle': 'var(--color-brand-100)',
				'brand-subtle-alt': 'var(--color-brand-200)',
				'brand-subtle2-alt': 'var(--color-brand-300)',
				info: 'var(--color-info)',
				'info-alt': 'var(--color-info-light)',
				'success-subtle': 'var(--color-success-lightest)',
				'success-subtle-alt': 'var(--color-success-lighter)',
				'warning-subtle': 'var(--color-warning-lightest)',
				'warning-subtle-alt': 'var(--color-warning-lighter)',
				'error-subtle': 'var(--color-error-lightest)',
				'error-subtle-alt': 'var(--color-error-lighter)',
				'brand-disabled': 'var(--color-brand-100)'
			},
			border: {
				base: 'var(--color-neutral-white)',
				primary: 'var(--color-neutral-200)',
				secondary: 'var(--color-neutral-300)',
				tertiary: 'var(--color-neutral-400)',
				'primary-inverted': 'var(--color-neutral-900)',
				'secondary-inverted': 'var(--color-neutral-800)',
				'tertiary-inverted': 'var(--color-neutral-500)',
				disabled: 'var(--color-neutral-200)',
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
	plugins: [addCSSVariablesForColors]
};
