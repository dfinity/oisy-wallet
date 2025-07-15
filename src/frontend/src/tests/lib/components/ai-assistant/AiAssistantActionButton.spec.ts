import AiAssistantActionButton from '$lib/components/ai-assistant/AiAssistantActionButton.svelte';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('AiAssistantActionButton', () => {
	it('renders correctly', () => {
		const icon = 'icon';
		const title = 'title';
		const subtitle = 'subtitle';
		const { getByText } = render(AiAssistantActionButton, {
			props: {
				icon: createRawSnippet(() => ({
					render: () => icon
				})),
				title,
				subtitle,
				onClick: () => {}
			}
		});

		expect(getByText(icon)).toBeInTheDocument();
		expect(getByText(title)).toBeInTheDocument();
		expect(getByText(subtitle)).toBeInTheDocument();
	});
});
