import LayoutDecorator from '$lib/decorators/LayoutDecorator.svelte';
import '$lib/styles/global.scss';
import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport';
import type { Preview } from '@storybook/svelte';

const preview: Preview = {
	parameters: {
		actions: { argTypesRegex: '^on.*' },
		viewport: {
			viewports: [
				INITIAL_VIEWPORTS.iphonex,
				INITIAL_VIEWPORTS.iphone14pro,
				{
					name: 'Small Desktop',
					styles: {
						width: '1024px',
						height: '768px'
					}
				}
			]
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		}
	},
	decorators: [
		(story, context) => {
			document.querySelector('html')?.setAttribute('theme', context.globals.theme || 'light');
			return story();
		},
		() => LayoutDecorator
	],
	globalTypes: {
		theme: {
			description: 'Global theme for components',
			toolbar: {
				// The label to show for this toolbar item
				title: 'Theme',
				icon: 'circlehollow',
				// Array of plain string values or MenuItem shape (see below)
				items: ['light', 'dark'],
				// Change title based on selected value
				dynamicTitle: true
			}
		}
	},
	initialGlobals: {
		theme: 'light'
	}
};

export default preview;
