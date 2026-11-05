import {
	ToolResultType,
	type ChatMessage,
	type ReviewSendTokensToolResult
} from '$lib/types/ai-assistant';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export interface AiAssistant {
	isOpen: boolean;
	chatHistory: ChatMessage[];
}

export interface AiAssistantStore extends Readable<AiAssistant | undefined> {
	open: () => void;
	close: () => void;
	reset: () => void;
	resetChatHistory: () => void;
	appendMessage: (message: ChatMessage) => void;
	removeLastMessage: () => void;
	setSendToolActionAsCompleted: (id: string) => void;
	setSendToolActionAsOutcomeUnknown: (id: string) => void;
}

const initialState = {
	isOpen: false,
	chatHistory: []
} as AiAssistant;

const updateSendToolResult = ({
	chatHistory,
	id,
	change
}: {
	chatHistory: ChatMessage[];
	id: string;
	change: Partial<Pick<ReviewSendTokensToolResult, 'sendCompleted' | 'sendOutcomeUnknown'>>;
}): ChatMessage[] =>
	chatHistory.map((message) =>
		message.role === 'assistant' && message.data.tool?.results
			? {
					...message,
					data: {
						...message.data,
						tool: {
							...message.data.tool,
							results: message.data.tool.results.map((toolResult) => {
								if (
									toolResult.type === ToolResultType.REVIEW_SEND_TOKENS &&
									nonNullish(toolResult.result) &&
									'id' in toolResult.result &&
									toolResult.result.id === id
								) {
									return {
										...toolResult,
										result: { ...toolResult.result, ...change }
									};
								}

								return toolResult;
							})
						}
					}
				}
			: message
	);

const initAiAssistantStore = (): AiAssistantStore => {
	const { subscribe, update, set } = writable<AiAssistant>(initialState);

	return {
		subscribe,

		open: () => {
			update((state) => ({ ...state, isOpen: true }));
		},

		close: () => {
			update((state) => ({ ...state, isOpen: false }));
		},

		reset: () => {
			set(initialState);
		},

		resetChatHistory: () => {
			update((state) => ({ ...state, chatHistory: initialState.chatHistory }));
		},

		appendMessage: (message: ChatMessage) => {
			update((state) => ({ ...state, chatHistory: [...state.chatHistory, message] }));
		},

		removeLastMessage: () => {
			update((state) => ({ ...state, chatHistory: [...state.chatHistory.slice(0, -1)] }));
		},

		setSendToolActionAsCompleted: (id: string) => {
			update((state) => ({
				...state,
				chatHistory: updateSendToolResult({
					chatHistory: state.chatHistory,
					id,
					change: { sendCompleted: true }
				})
			}));
		},

		setSendToolActionAsOutcomeUnknown: (id: string) => {
			update((state) => ({
				...state,
				chatHistory: updateSendToolResult({
					chatHistory: state.chatHistory,
					id,
					change: { sendOutcomeUnknown: true }
				})
			}));
		}
	};
};

export const aiAssistantStore = initAiAssistantStore();
