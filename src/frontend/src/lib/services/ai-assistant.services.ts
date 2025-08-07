import type { chat_message_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import {
	AI_ASSISTANT_FILTER_CONTACTS_PROMPT,
	AI_ASSISTANT_LLM_MODEL,
	AI_ASSISTANT_SYSTEM_PROMPT,
	AI_ASSISTANT_TOOLS
} from '$lib/constants/ai-assistant.constants';
import {
	contacts,
	extendedAddressContacts as extendedAddressContactsStore
} from '$lib/derived/contacts.derived';
import type {
	AiAssistantContactUi,
	ChatMessageContent,
	ToolCall,
	ToolCallArgument,
	ToolResult
} from '$lib/types/ai-assistant';
import type { ContactUi } from '$lib/types/contact';
import {
	parseFromAiAssistantContacts,
	parseToAiAssistantContacts
} from '$lib/utils/ai-assistant.utils';
import type { Identity } from '@dfinity/agent';
import { fromNullable, isNullish, jsonReplacer, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Gets a text or a tool response from LLM for the provided messages array.
 *
 * @async
 * @param {Object} params - The parameters required to initiate an LLM request.
 * @param {Array} params.messages - Array of messages that should be sent to LLM.
 * @param {Identity} params.identity - The user's identity for authentication.
 * @returns {Promise<ChatMessageContent>} - Resolves with a text content or with a parsed LLM tool result
 */
export const askLlm = async ({
	messages,
	identity
}: {
	messages: chat_message_v1[];
	identity: Identity;
}): Promise<ChatMessageContent> => {
	const {
		message: { content }
	} = await llmChat({
		request: {
			model: AI_ASSISTANT_LLM_MODEL,
			messages,
			// TODO: implement tools
			tools: toNullable()
		},
		identity
	});

	return {
		text: fromNullable(content),
		tool: {
			calls: [],
			results: []
		}
	};
};

/**
 * Makes a call to LLM to get a semantically filtered contacts.
 *
 * @async
 * @param {Object} params - The parameters required to initiate a filter contacts LLM request.
 * @param {Identity} params.identity - The user's identity for authentication.
 * @param {Array} params.filterParams - Array of filter arguments based on which the search will be done by LLM.
 * @returns {Promise<ChatMessageContent>} - Resolves with an array of filtered contacts.
 */
export const askLlmToFilterContacts = async ({
	identity,
	filterParams
}: {
	identity: Identity;
	filterParams: ToolCallArgument[];
}): Promise<ContactUi[]> => {
	const extendedAddressContacts = get(extendedAddressContactsStore);
	const aiAssistantContacts = parseToAiAssistantContacts(extendedAddressContacts);

	const {
		message: { content }
	} = await llmChat({
		request: {
			model: AI_ASSISTANT_LLM_MODEL,
			messages: [
				{
					system: {
						content: AI_ASSISTANT_SYSTEM_PROMPT
					}
				},
				{
					user: {
						content: `
							${AI_ASSISTANT_FILTER_CONTACTS_PROMPT}
								
							Contacts: ${JSON.stringify(aiAssistantContacts, jsonReplacer)}
							Arguments: "${JSON.stringify(filterParams)}"
						`
					}
				}
			],
			tools: toNullable(AI_ASSISTANT_TOOLS)
		},
		identity
	});

	const filteredAiAssistantContacts: AiAssistantContactUi[] =
		JSON.parse(fromNullable(content) ?? '', jsonReplacer)?.contacts ?? [];

	return parseFromAiAssistantContacts({
		aiAssistantContacts: filteredAiAssistantContacts,
		extendedAddressContacts
	});
};

/**
 * Executes a tool based on the name param returned by LLM.
 *
 * @async
 * @param {Object} params - The parameters required to launch a tool.
 * @param {Array} params.toolCall - A tool call description object returned by LLM.
 * @param {Identity} params.identity - The user's identity for authentication.
 * @returns {Promise<ChatMessageContent>} - Resolves with a tool result or undefined if tool name is unknown.
 */
export const executeTool = async ({
	toolCall,
	identity
}: {
	toolCall: ToolCall;
	identity: Identity;
}): Promise<ToolResult | undefined> => {
	const {
		function: { name, arguments: filterParams }
	} = toolCall;

	let result: ToolResult['result'] | undefined;

	if (name === 'show_contacts') {
		result =
			isNullish(filterParams) || filterParams.length === 0
				? get(contacts)
				: await askLlmToFilterContacts({ filterParams, identity });
	}

	return { type: name as ToolResult['type'], result };
};
