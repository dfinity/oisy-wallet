import type { chat_response_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import AiAssistantConsole from '$lib/components/ai-assistant/AiAssistantConsole.svelte';
import { AI_ASSISTANT_SEND_MESSAGE_BUTTON } from '$lib/constants/test-ids.constants';
import { nullishSignOut } from '$lib/services/auth.services';
import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
import type { ChatMessage } from '$lib/types/ai-assistant';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { toNullable } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

vi.mock('$lib/services/auth.services');
vi.mock('$lib/api/llm.api');

describe('AiAssistantConsole', () => {
	const message = {
		role: 'user',
		data: { text: 'hey' }
	} as ChatMessage;
	const newMessageContent = 'new message';
	const responseContent = 'content';
	const response = {
		message: {
			content: toNullable(responseContent),
			tool_calls: toNullable()
		}
	} as chat_response_v1;

	vi.mocked(llmChat).mockResolvedValue(response);
	vi.mocked(nullishSignOut).mockResolvedValue();

	beforeEach(() => {
		aiAssistantStore.reset();
	});

	it('renders welcome message if the store is empty', () => {
		const { getByText } = render(AiAssistantConsole);

		expect(getByText(en.ai_assistant.text.welcome_message)).toBeInTheDocument();
	});

	it('renders messages if the store is not empty', async () => {
		const { getByText } = render(AiAssistantConsole);

		aiAssistantStore.appendMessage(message);

		await waitFor(() => {
			expect(() => getByText(en.ai_assistant.text.welcome_message)).toThrow();
			expect(getByText(message.data.text ?? '')).toBeInTheDocument();
		});
	});

	it('sends sends message correctly', async () => {
		mockAuthStore();

		const { getByText, getByTestId, getByPlaceholderText } = render(AiAssistantConsole);

		const input = getByPlaceholderText(en.ai_assistant.text.send_message_input_placeholder);
		const button = getByTestId(AI_ASSISTANT_SEND_MESSAGE_BUTTON);

		await fireEvent.input(input, { target: { value: newMessageContent } });

		await waitFor(async () => {
			await fireEvent.click(button);

			expect(getByText(newMessageContent)).toBeInTheDocument();
			expect(getByText(responseContent)).toBeInTheDocument();
		});
	});

	it('calls nullishSignOut if no identity available', async () => {
		vi.resetAllMocks();

		const { getByTestId, getByPlaceholderText } = render(AiAssistantConsole);

		const input = getByPlaceholderText(en.ai_assistant.text.send_message_input_placeholder);
		const button = getByTestId(AI_ASSISTANT_SEND_MESSAGE_BUTTON);

		await fireEvent.input(input, { target: { value: newMessageContent } });

		await waitFor(async () => {
			await fireEvent.click(button);

			expect(nullishSignOut).toHaveBeenCalledOnce();
		});
	});
});
