import AiAssistantUserMessage from '$lib/components/ai-assistant/AiAssistantUserMessage.svelte';
import { render } from '@testing-library/svelte';

describe('AiAssistantUserMessage', () => {
	it('renders correctly', () => {
		const content = 'content';
		const { getByText } = render(AiAssistantUserMessage, {
			props: {
				content
			}
		});

		expect(getByText(content)).toBeInTheDocument();
	});
});
