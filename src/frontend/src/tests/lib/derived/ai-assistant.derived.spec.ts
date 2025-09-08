import {
	aiAssistantChatMessages,
	aiAssistantConsoleOpen,
	aiAssistantLlmMessages,
	aiAssistantSystemMessage
} from '$lib/derived/ai-assistant.derived';
import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
import type { ChatMessage } from '$lib/types/ai-assistant';
import { get } from 'svelte/store';

describe('ai-assistant.derived', () => {
	const message = {
		role: 'user',
		data: { text: 'hey' }
	} as ChatMessage;

	beforeEach(() => {
		aiAssistantStore.reset();
	});

	describe('aiAssistantConsoleOpen', () => {
		it('should return correct values', () => {
			expect(get(aiAssistantConsoleOpen)).toBeFalsy();

			aiAssistantStore.open();

			expect(get(aiAssistantConsoleOpen)).toBeTruthy();
		});
	});

	describe('aiAssistantChatMessages', () => {
		it('should return correct values', () => {
			expect(get(aiAssistantChatMessages)).toStrictEqual([]);

			aiAssistantStore.appendMessage(message);

			expect(get(aiAssistantChatMessages)).toStrictEqual([message]);
		});
	});

	describe('aiAssistantLlmMessages', () => {
		it('should return correct values', () => {
			const systemMessage = get(aiAssistantSystemMessage);

			expect(get(aiAssistantLlmMessages)).toStrictEqual([systemMessage]);

			aiAssistantStore.appendMessage(message);

			expect(get(aiAssistantLlmMessages)).toStrictEqual([
				systemMessage,
				{
					user: {
						content: message.data.text
					}
				}
			]);
		});
	});

	describe('ainAssistantSystemMessage', () => {
		it('should include available tokens and contacts sections', () => {
			const store = get(aiAssistantSystemMessage) as { system: { content: string } };

			expect(store.system.content.includes('AVAILABLE TOKENS')).toBeTruthy();
			expect(store.system.content.includes('AVAILABLE CONTACTS')).toBeTruthy();
		});
	});
});
