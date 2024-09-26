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
			'light-blue': '#ede7fb',
			blue: '#3b00b9',
			'blue-ribbon-rgb': '0, 102, 255',
			'dark-blue': '#321469',
			'brandeis-blue': '#016dfc',
			'cetacean-blue': '#0e002d',
			'pale-cornflower-blue': '#b0cdff',
			'brilliant-azure': '#348afd',
			'misty-rose': '#937993',
			goldenrod: '#dfa81b',
			cyclamen: '#ea6c99',
			'mountain-meadow': '#30af91',
			'alice-blue': '#ecf3fb',
			'american-orange': '#ff8a00',
			'crayola-yellow': '#ffe57f',
			cornsilk: '#fff7d8'
		},
		extend: {
			minWidth: {
				'2_5xl': '1728px'
			}
		}
	},
	plugins: []
};
