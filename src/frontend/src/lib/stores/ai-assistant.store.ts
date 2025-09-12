import type { ChatMessage } from '$lib/types/ai-assistant';
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
		}
	};
};

export const aiAssistantStore = initAiAssistantStore();
