import type { IcSendRequest } from '$icp/types/ic-send';
import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
import { ToolResultType, type ChatMessage, type ToolResult } from '$lib/types/ai-assistant';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';
import { get } from 'svelte/store';

describe('ai-assistant.store', () => {
	const mockRandomUUID = 'd7775002-80bf-4208-a2f0-84225281677a';

	const defaultState = {
		isOpen: false,
		chatHistory: [],
		icSendRequests: {}
	};

	const icSendRequest: IcSendRequest = {
		tokenId: mockValidIcrcToken.id,
		to: mockPrincipalText,
		amount: 1_000n,
		createdAt: 1_700_000_000_000_000_000n
	};

	const message = {
		role: 'user',
		data: { text: 'hey' }
	} as ChatMessage;

	beforeEach(() => {
		aiAssistantStore.reset();

		mockPage.reset();
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() => aiAssistantStore);
	});

	it('should have correct initial values', () => {
		expect(get(aiAssistantStore)).toStrictEqual(defaultState);
	});

	it('should open and close AI assistant console', () => {
		aiAssistantStore.open();

		expect(get(aiAssistantStore)).toStrictEqual({
			...defaultState,
			isOpen: true
		});

		aiAssistantStore.close();

		expect(get(aiAssistantStore)).toStrictEqual(defaultState);
	});

	it('should reset chat history', () => {
		aiAssistantStore.appendMessage(message);
		aiAssistantStore.open();

		expect(get(aiAssistantStore)).toStrictEqual({
			...defaultState,
			isOpen: true,
			chatHistory: [...defaultState.chatHistory, message]
		});

		aiAssistantStore.resetChatHistory();

		expect(get(aiAssistantStore)).toStrictEqual({
			...defaultState,
			isOpen: true,
			chatHistory: []
		});
	});

	it('should keep the IC send request of each review by its id', () => {
		const otherRequest: IcSendRequest = { ...icSendRequest, amount: 2_000n };

		aiAssistantStore.setIcSendRequest({ id: mockRandomUUID, request: icSendRequest });
		aiAssistantStore.setIcSendRequest({ id: 'other-review', request: otherRequest });

		expect(get(aiAssistantStore)?.icSendRequests).toStrictEqual({
			[mockRandomUUID]: icSendRequest,
			'other-review': otherRequest
		});
	});

	it('should keep the IC send requests when the console closes', () => {
		aiAssistantStore.open();
		aiAssistantStore.setIcSendRequest({ id: mockRandomUUID, request: icSendRequest });
		aiAssistantStore.close();

		expect(get(aiAssistantStore)?.icSendRequests).toStrictEqual({
			[mockRandomUUID]: icSendRequest
		});
	});

	it('should drop the IC send requests with the chat history', () => {
		aiAssistantStore.setIcSendRequest({ id: mockRandomUUID, request: icSendRequest });

		aiAssistantStore.resetChatHistory();

		expect(get(aiAssistantStore)?.icSendRequests).toStrictEqual({});
	});

	it('should drop the IC send requests on reset', () => {
		aiAssistantStore.setIcSendRequest({ id: mockRandomUUID, request: icSendRequest });

		aiAssistantStore.reset();

		expect(get(aiAssistantStore)).toStrictEqual(defaultState);
	});

	it('should append a message', () => {
		aiAssistantStore.appendMessage(message);

		expect(get(aiAssistantStore)).toStrictEqual({
			...defaultState,
			chatHistory: [...defaultState.chatHistory, message]
		});
	});

	it('should remove last message', () => {
		aiAssistantStore.appendMessage(message);

		expect(get(aiAssistantStore)).toStrictEqual({
			...defaultState,
			chatHistory: [...defaultState.chatHistory, message]
		});

		aiAssistantStore.removeLastMessage();

		expect(get(aiAssistantStore)).toStrictEqual({
			...defaultState,
			chatHistory: defaultState.chatHistory
		});
	});

	it('should update the send status of review_send_token tool correctly', () => {
		// vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => mockRandomUUID);
		const toolMessage = {
			role: 'assistant',
			data: {
				tool: {
					calls: [],
					results: [
						{
							type: ToolResultType.REVIEW_SEND_TOKENS,
							result: { sendCompleted: false, id: mockRandomUUID }
						} as ToolResult
					]
				}
			}
		} as ChatMessage;

		aiAssistantStore.appendMessage(toolMessage);

		expect(get(aiAssistantStore)).toStrictEqual({
			...defaultState,
			chatHistory: [...defaultState.chatHistory, toolMessage]
		});

		aiAssistantStore.setSendToolActionAsCompleted(mockRandomUUID);

		expect(get(aiAssistantStore)).toStrictEqual({
			...defaultState,
			chatHistory: [
				...defaultState.chatHistory,
				{
					...toolMessage,
					data: {
						...toolMessage.data,
						tool: {
							...toolMessage.data.tool,
							results: [
								{
									type: ToolResultType.REVIEW_SEND_TOKENS,
									result: { sendCompleted: true, id: mockRandomUUID }
								} as ToolResult
							]
						}
					}
				} as ChatMessage
			]
		});
	});

	it('should mark only the given review_send_token tool as having an unknown send outcome', () => {
		const otherId = '0b8e2c43-6f0f-4b9e-9d5c-2f5b4b0c9a11';

		const reviewResult = (result: object) =>
			({ type: ToolResultType.REVIEW_SEND_TOKENS, result }) as ToolResult;

		const toolMessage = {
			role: 'assistant',
			data: {
				tool: {
					calls: [],
					results: [
						reviewResult({ sendCompleted: false, id: mockRandomUUID }),
						reviewResult({ sendCompleted: false, id: otherId })
					]
				}
			}
		} as ChatMessage;

		aiAssistantStore.appendMessage(toolMessage);

		aiAssistantStore.setSendToolActionAsOutcomeUnknown(mockRandomUUID);

		expect(get(aiAssistantStore)).toStrictEqual({
			...defaultState,
			chatHistory: [
				{
					...toolMessage,
					data: {
						...toolMessage.data,
						tool: {
							...toolMessage.data.tool,
							results: [
								reviewResult({
									sendCompleted: false,
									sendOutcomeUnknown: true,
									id: mockRandomUUID
								}),
								reviewResult({ sendCompleted: false, id: otherId })
							]
						}
					}
				} as ChatMessage
			]
		});
	});
});
