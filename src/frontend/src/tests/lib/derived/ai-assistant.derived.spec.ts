import { AI_ASSISTANT_SYSTEM_PROMPT } from '$lib/constants/ai-assistant.constants';
import {
	aiAssistantChatMessages,
	aiAssistantConsoleOpen,
	aiAssistantLlmMessages
} from '$lib/derived/ai-assistant.derived';
import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
import type { ChatMessage } from '$lib/types/ai-assistant';
import { get } from 'svelte/store';

describe('ai-assistant.derived', () => {
	const message = {
		role: 'user',
		content: 'hey'
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
			const defaultMessage = {
				role: 'system',
				content: AI_ASSISTANT_SYSTEM_PROMPT
			} as ChatMessage;

			expect(get(aiAssistantChatMessages)).toStrictEqual([defaultMessage]);

			aiAssistantStore.appendMessage(message);

			expect(get(aiAssistantChatMessages)).toStrictEqual([defaultMessage, message]);
		});
	});

	describe('aiAssistantLlmMessages', () => {
		it('should return correct values', () => {
			const defaultLlmMessage = {
				system: {
					content: AI_ASSISTANT_SYSTEM_PROMPT
				}
			};

			expect(get(aiAssistantLlmMessages)).toStrictEqual([defaultLlmMessage]);

			aiAssistantStore.appendMessage(message);

			expect(get(aiAssistantLlmMessages)).toStrictEqual([
				defaultLlmMessage,
				{
					user: {
						content: message.content
					}
				}
			]);
		});
	});
});
