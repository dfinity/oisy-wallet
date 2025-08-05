import AiAssistantMessages from '$lib/components/ai-assistant/AiAssistantMessages.svelte';
import type { ChatMessage } from '$lib/types/ai-assistant';
import en from '$tests/mocks/i18n.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('AiAssistantUserMessages', () => {
	const userMessage = 'user message';
	const assistantMessage = 'assistant message';
	const systemMessage = 'system message';

	const messages = [
		{ role: 'user', data: { text: userMessage } },
		{ role: 'assistant', data: { text: assistantMessage } },
		{ role: 'system', data: { text: systemMessage } }
	] as ChatMessage[];

	it('renders correctly if loading is false', async () => {
		const { getByText } = render(AiAssistantMessages, {
			props: {
				messages,
				loading: false
			}
		});

		await waitFor(() => {
			expect(getByText(userMessage)).toBeInTheDocument();
			expect(getByText(assistantMessage)).toBeInTheDocument();
			expect(() => getByText(systemMessage)).toThrow();
			expect(() => getByText(en.ai_assistant.text.loading)).toThrow();
		});
	});

	it('renders correctly if loading is true', async () => {
		const { getByText } = render(AiAssistantMessages, {
			props: {
				messages,
				loading: true
			}
		});

		await waitFor(() => {
			expect(getByText(userMessage)).toBeInTheDocument();
			expect(getByText(assistantMessage)).toBeInTheDocument();
			expect(getByText(en.ai_assistant.text.loading)).toBeInTheDocument();
			expect(() => getByText(systemMessage)).toThrow();
		});
	});
});
