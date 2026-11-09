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

	it('keeps the markup markdown produces and drops any other', async () => {
		const content =
			'**Balance** [details](https://oisy.com)\n\n<div style="position:fixed">Notice</div><style>p{display:none}</style><button>Approve</button>';

		const { container } = render(AiAssistantBotMessage, {
			props: {
				content,
				isLastItem: false,
				onRetry: vi.fn()
			}
		});

		await waitFor(() => {
			expect(container.querySelector('strong')?.textContent).toBe('Balance');
		});

		expect(container.querySelector('a')?.getAttribute('href')).toBe('https://oisy.com');
		expect(container.querySelector('[style]')).toBeNull();
		expect(container.querySelector('style')).toBeNull();
		expect(container.querySelector('button')).toBeNull();
	});
});
