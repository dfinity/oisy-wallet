import { ToolResultType, type ChatMessage } from '$lib/types/ai-assistant';
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
}

const initialState = {
	isOpen: false,
	chatHistory: []
} as AiAssistant;

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
				chatHistory: state.chatHistory.map((message) =>
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
													result: { ...toolResult.result, sendCompleted: true }
												};
											}

											return toolResult;
										})
									}
								}
							}
						: message
				)
			}));
		}
	};
};

export const aiAssistantStore = initAiAssistantStore();
