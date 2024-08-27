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
			black: 'rgb(0 0 0)',
			white: 'rgb(255 255 255)',
			'off-white': '#fcfaf6',
			dust: '#dbd9d6',
			grey: '#c0bbc4',
			'light-blue': '#ede7fb',
			blue: '#3b00b9',
			dark: '#0e002d',
			'dark-blue': '#321469',
			'navy-blue': '#01016d',
			'brandeis-blue': '#016dfc',
			'crayola-blue': '#147bff',
			'spiro-disco-ball': '#1bb5ff',
			'misty-rose': '#937993',
			goldenrod: '#dfa81b',
			cyclamen: '#ea6c99',
			'medium-purple': '#8969d5',
			platinum: '#e4e4e4',
			'mountain-meadow': '#30af91',
			'dodger-blue': '#1e90ff',
			turquoise: '#59e7d6'
		}
	},
	plugins: []
};
