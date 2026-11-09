import AiAssistantMessages from '$lib/components/ai-assistant/AiAssistantMessages.svelte';
import { ToolResultType, type ChatMessage } from '$lib/types/ai-assistant';
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

	const props = {
		messages,
		onSendMessage: vi.fn(),
		onRetry: vi.fn()
	};

	it('renders correctly if loading is false', async () => {
		const { getByText } = render(AiAssistantMessages, {
			props: {
				...props,
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

	it('renders the tool results and the text of the same message', async () => {
		const { getByText } = render(AiAssistantMessages, {
			props: {
				...props,
				loading: false,
				messages: [
					{
						role: 'assistant',
						data: {
							text: assistantMessage,
							tool: {
								calls: [],
								results: [{ type: ToolResultType.SHOW_ALL_CONTACTS, result: { contacts: [] } }]
							}
						}
					}
				]
			}
		});

		await waitFor(() => {
			expect(getByText(en.ai_assistant.text.no_contacts_found_message)).toBeInTheDocument();
			expect(getByText(assistantMessage)).toBeInTheDocument();
		});
	});

	it('renders correctly if loading is true', async () => {
		const { getByText } = render(AiAssistantMessages, {
			props: {
				...props,
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
