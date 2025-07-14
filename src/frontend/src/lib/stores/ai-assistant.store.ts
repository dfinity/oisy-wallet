import { AI_ASSISTANT_SYSTEM_PROMPT } from '$lib/constants/ai-assistant.constants';
import type { ChatMessage } from '$lib/types/ai-assistant';
import { writable, type Readable } from 'svelte/store';

export interface AiAssistant {
	isOpen: boolean;
	chatHistory: ChatMessage[];
}

export interface AiAssistantStore extends Readable<AiAssistant | undefined> {
	open: () => void;
	close: () => void;
	appendMessage: (message: ChatMessage) => void;
}

const initAiAssistantStore = (): AiAssistantStore => {
	const { subscribe, update } = writable<AiAssistant>({
		isOpen: false,
		chatHistory: [
			{
				role: 'system',
				content: AI_ASSISTANT_SYSTEM_PROMPT
			}
		]
	});

	return {
		subscribe,

		open: () => {
			update((state) => ({ ...state, isOpen: true }));
		},

		close: () => {
			update((state) => ({ ...state, isOpen: false }));
		},

		appendMessage: (message: ChatMessage) => {
			update((state) => ({ ...state, chatHistory: [...state.chatHistory, message] }));
		}
	};
};

export const aiAssistantStore = initAiAssistantStore();
