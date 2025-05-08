// See: https://storybook.js.org/docs/get-started/frameworks/sveltekit
import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
	stories: [
		'../src/frontend/src/**/*.mdx',
		'../src/frontend/src/**/*.stories.@(js|jsx|mjs|ts|tsx|svelte)'
	],
	addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
	framework: {
		name: '@storybook/sveltekit',
		options: {}
	},
	docs: {
		autodocs: 'tag'
	},
	staticDirs: ['../src/frontend/static']
};
export default config;
