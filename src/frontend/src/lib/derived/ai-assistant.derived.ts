import type { chat_message_v1 } from '$declarations/llm/llm.did';
import {
	getAiAssistantSystemPrompt,
	MAX_SUPPORTED_AI_ASSISTANT_CHAT_LENGTH
} from '$lib/constants/ai-assistant.constants';
import { extendedAddressContacts } from '$lib/derived/contacts.derived';
import { enabledTokens } from '$lib/derived/tokens.derived';
import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
import type { ChatMessage } from '$lib/types/ai-assistant';
import { parseToAiAssistantContacts } from '$lib/utils/ai-assistant.utils';
import { jsonReplacer, notEmptyString, toNullable } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const aiAssistantConsoleOpen: Readable<boolean> = derived(
	[aiAssistantStore],
	([$aiAssistantStore]) => $aiAssistantStore?.isOpen ?? false
);

export const aiAssistantChatMessages: Readable<ChatMessage[]> = derived(
	[aiAssistantStore],
	([$aiAssistantStore]) => $aiAssistantStore?.chatHistory ?? []
);

export const aiAssistantSystemMessage: Readable<chat_message_v1> = derived(
	[extendedAddressContacts, enabledTokens],
	([$extendedAddressContacts, $enabledTokens]) => {
		const aiAssistantContacts = Object.values(parseToAiAssistantContacts($extendedAddressContacts));
		const aiEnabledTokens = $enabledTokens.map(({ name, symbol, network: { id: networkId } }) => ({
			name,
			symbol,
			networkId: networkId.description
		}));

		return {
			system: {
				content: getAiAssistantSystemPrompt({
					availableTokens: JSON.stringify(aiEnabledTokens, jsonReplacer),
					availableContacts: JSON.stringify(aiAssistantContacts, jsonReplacer)
				})
			}
		};
	}
);

export const aiAssistantLlmMessages: Readable<chat_message_v1[]> = derived(
	[aiAssistantStore, aiAssistantSystemMessage],
	([$aiAssistantStore, $aiAssistantSystemMessage]) => {
		// Get the last 100 messages from chat history and deduct 1 slot reserved for the system message
		const recentHistory = ($aiAssistantStore?.chatHistory ?? []).slice(
			-MAX_SUPPORTED_AI_ASSISTANT_CHAT_LENGTH + 1
		);

		return [
			$aiAssistantSystemMessage,

			// Parse chat messages into LLM-compatible messages
			...recentHistory.reduce<chat_message_v1[]>((acc, { role, data: { text, tool, context } }) => {
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
								content: `${text}${notEmptyString(context) ? ` ${context}` : ''}`
							}
						}
					];
				}

				return acc;
			}, [])
		];
	}
);
