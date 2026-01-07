import AiAssistantBotMessage from '$lib/components/ai-assistant/AiAssistantBotMessage.svelte';
import { render, waitFor } from '@testing-library/svelte';

describe('AiAssistantBotMessage', () => {
	it('renders correctly', async () => {
		const content = 'content';
		const { getByText } = render(AiAssistantBotMessage, {
			props: {
				content,
				isLastItem: false,
				onRetry: vi.fn()
			}
		});

		await waitFor(() => {
			expect(getByText(content)).toBeInTheDocument();
		});
	});
});
