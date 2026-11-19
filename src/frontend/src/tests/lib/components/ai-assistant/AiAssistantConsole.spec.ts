import type { chat_response_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import AiAssistantConsole from '$lib/components/ai-assistant/AiAssistantConsole.svelte';
import { AI_ASSISTANT_SEND_MESSAGE_BUTTON } from '$lib/constants/test-ids.constants';
import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
import { bottomSheetOpenStore } from '$lib/stores/ui.store';
import type { ChatMessage } from '$lib/types/ai-assistant';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { toNullable } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

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

	beforeEach(() => {
		aiAssistantStore.reset();
		bottomSheetOpenStore.set(false);
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

	it('marks a message from the chat input as typed by the user', async () => {
		mockAuthStore();

		const { getByTestId, getByPlaceholderText } = render(AiAssistantConsole);

		await fireEvent.input(
			getByPlaceholderText(en.ai_assistant.text.send_message_input_placeholder),
			{ target: { value: newMessageContent } }
		);
		await fireEvent.click(getByTestId(AI_ASSISTANT_SEND_MESSAGE_BUTTON));

		await waitFor(() => {
			const [{ data }] = get(aiAssistantStore)?.chatHistory ?? [];

			expect(data.text).toBe(newMessageContent);
			expect(data.typedByUser).toBeTruthy();
		});
	});

	it('does not mark a message OISY writes for the user as typed by the user', async () => {
		mockAuthStore();

		const { getByText } = render(AiAssistantConsole);

		await fireEvent.click(getByText(en.ai_assistant.text.action_button_contacts_title));

		await waitFor(() => {
			const [{ data }] = get(aiAssistantStore)?.chatHistory ?? [];

			expect(data.text).toBe(en.ai_assistant.text.action_button_contacts_prompt);
			expect(data).not.toHaveProperty('typedByUser');
		});
	});

	it('shows the address request next to the card of another tool', async () => {
		mockAuthStore();

		vi.mocked(llmChat).mockResolvedValueOnce({
			message: {
				content: toNullable(),
				tool_calls: [
					{
						id: 'review',
						function: {
							name: 'review_send_tokens',
							arguments: [
								{ name: 'address', value: mockEthAddress },
								{ name: 'amountNumber', value: '0.01' },
								{ name: 'tokenSymbol', value: 'ETH' },
								{ name: 'networkId', value: 'ETH' }
							]
						}
					},
					{ id: 'contacts', function: { name: 'show_all_contacts', arguments: [] } }
				]
			}
		} as chat_response_v1);

		const { getByText, getByTestId, getByPlaceholderText } = render(AiAssistantConsole);

		await fireEvent.input(
			getByPlaceholderText(en.ai_assistant.text.send_message_input_placeholder),
			{ target: { value: 'Send 0.01 ETH and show my contacts' } }
		);
		await fireEvent.click(getByTestId(AI_ASSISTANT_SEND_MESSAGE_BUTTON));

		await waitFor(() => {
			expect(getByText(en.ai_assistant.text.no_contacts_found_message)).toBeInTheDocument();
			expect(getByText(en.ai_assistant.text.type_send_address_message)).toBeInTheDocument();
		});
	});

	it('hides the mobile navigation bar while open', async () => {
		render(AiAssistantConsole);

		await waitFor(() => {
			expect(get(bottomSheetOpenStore)).toBeTruthy();
		});
	});

	it('restores the mobile navigation bar once closed', async () => {
		const { unmount } = render(AiAssistantConsole);

		await waitFor(() => {
			expect(get(bottomSheetOpenStore)).toBeTruthy();
		});

		unmount();

		expect(get(bottomSheetOpenStore)).toBeFalsy();
	});
});
