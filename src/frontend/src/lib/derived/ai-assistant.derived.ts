import type { chat_message_v1 } from '$declarations/llm/llm.did';
import {
	AI_ASSISTANT_SYSTEM_PROMPT,
	MAX_SUPPORTED_AI_ASSISTANT_CHAT_LENGTH
} from '$lib/constants/ai-assistant.constants';
import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
import type { ChatMessage } from '$lib/types/ai-assistant';
import { notEmptyString, toNullable } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const aiAssistantConsoleOpen: Readable<boolean> = derived(
	[aiAssistantStore],
	([$aiAssistantStore]) => $aiAssistantStore?.isOpen ?? false
);

export const aiAssistantChatMessages: Readable<ChatMessage[]> = derived(
	[aiAssistantStore],
	([$aiAssistantStore]) => $aiAssistantStore?.chatHistory ?? []
);

export const aiAssistantLlmMessages: Readable<chat_message_v1[]> = derived(
	[aiAssistantStore],
	([$aiAssistantStore]) => {
		let includesSystemMessage = false;

		// Get last 100 messages from chat history
		const recentHistory = ($aiAssistantStore?.chatHistory ?? []).slice(
			-MAX_SUPPORTED_AI_ASSISTANT_CHAT_LENGTH
		);

		// Parse chat messages into LLM-compatible messages
		const messages = recentHistory.reduce<chat_message_v1[]>(
			(acc, { role, data: { text, tool } }) => {
				if (role === 'system' && notEmptyString(text)) {
					includesSystemMessage = true;

					return [
						...acc,
						{
							system: {
								content: text
							}
						}
					];
				}
				if (role === 'assistant') {
					return [
						...acc,
						{
							assistant: {
								content: toNullable(text),
								tool_calls: tool?.calls ?? []
							}
						}
					];
				}
				if (role === 'user' && notEmptyString(text)) {
					return [
						...acc,
						{
							user: {
								content: text
							}
						}
					];
				}

				return acc;
			},
			[]
		);

		// If no system message in recent history, add the default one
		if (!includesSystemMessage) {
			messages.unshift({
				system: {
					content: AI_ASSISTANT_SYSTEM_PROMPT
				}
			});
		}

		return messages;
	}
);
