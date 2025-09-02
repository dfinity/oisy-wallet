import type { chat_message_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import {
	AI_ASSISTANT_LLM_MODEL,
	getAiAssistantFilterContactsPrompt,
	getAiAssistantToolsDescription
} from '$lib/constants/ai-assistant.constants';
import {
	AI_ASSISTANT_TEXTUAL_RESPONSE_RECEIVED,
	AI_ASSISTANT_TOOL_EXECUTION_TRIGGERED
} from '$lib/constants/analytics.contants';
import { aiAssistantSystemMessage } from '$lib/derived/ai-assistant.derived';
import { extendedAddressContacts as extendedAddressContactsStore } from '$lib/derived/contacts.derived';
import { enabledNetworksSymbols } from '$lib/derived/networks.derived';
import { enabledTokens, enabledUniqueTokensSymbols } from '$lib/derived/tokens.derived';
import { trackEvent } from '$lib/services/analytics.services';
import {
	ToolResultType,
	type ChatMessageContent,
	type ShowContactsToolResult,
	type ToolCall,
	type ToolCallArgument,
	type ToolResult
} from '$lib/types/ai-assistant';
import {
	parseFromAiAssistantContacts,
	parseReviewSendTokensToolArguments
} from '$lib/utils/ai-assistant.utils';
import type { Identity } from '@dfinity/agent';
import { fromNullable, isNullish, jsonReplacer, nonNullish, toNullable } from '@dfinity/utils';
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
	const requestStartTimestamp = Date.now();

	const {
		message: { content, tool_calls }
	} = await llmChat({
		request: {
			model: AI_ASSISTANT_LLM_MODEL,
			messages,
			tools: toNullable(
				getAiAssistantToolsDescription({
					enabledNetworksSymbols: get(enabledUniqueTokensSymbols),
					enabledTokensSymbols: get(enabledUniqueTokensSymbols)
				})
			)
		},
		identity
	});
	const toolResults: ToolResult[] = [];

	if (nonNullish(tool_calls) && tool_calls.length > 0) {
		for (const toolCall of tool_calls) {
			const result = await executeTool({ toolCall, identity, requestStartTimestamp });

			nonNullish(result) && toolResults.push(result);
		}
	} else {
		trackEvent({
			name: AI_ASSISTANT_TEXTUAL_RESPONSE_RECEIVED,
			metadata: { responseTime: `${(Date.now() - requestStartTimestamp) / 1000}s` }
		});
	}

	return {
		text: fromNullable(content),
		tool: {
			calls: tool_calls,
			results: toolResults
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
}): Promise<ShowContactsToolResult> => {
	const {
		message: { content }
	} = await llmChat({
		request: {
			model: AI_ASSISTANT_LLM_MODEL,
			messages: [
				get(aiAssistantSystemMessage),

				{
					user: {
						content: getAiAssistantFilterContactsPrompt(JSON.stringify(filterParams))
					}
				}
			],
			tools: toNullable(
				getAiAssistantToolsDescription({
					enabledNetworksSymbols: get(enabledNetworksSymbols),
					enabledTokensSymbols: get(enabledUniqueTokensSymbols)
				})
			)
		},
		identity
	});

	const data = JSON.parse(fromNullable(content) ?? '', jsonReplacer);

	return {
		contacts: parseFromAiAssistantContacts({
			aiAssistantContacts: data?.contacts ?? [],
			extendedAddressContacts: get(extendedAddressContactsStore)
		}),
		message: data?.message
	};
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
	identity,
	requestStartTimestamp
}: {
	toolCall: ToolCall;
	identity: Identity;
	requestStartTimestamp: number;
}): Promise<ToolResult | undefined> => {
	const {
		function: { name, arguments: filterParams }
	} = toolCall;

	let result: ToolResult['result'] | undefined;

	if (name === ToolResultType.SHOW_CONTACTS) {
		result =
			isNullish(filterParams) || filterParams.length === 0
				? { contacts: Object.values(get(extendedAddressContactsStore)) }
				: await askLlmToFilterContacts({ filterParams, identity });
	} else if (name === ToolResultType.REVIEW_SEND_TOKENS) {
		result = parseReviewSendTokensToolArguments({
			filterParams,
			extendedAddressContacts: get(extendedAddressContactsStore),
			tokens: get(enabledTokens)
		});
	}

	trackEvent({
		name: AI_ASSISTANT_TOOL_EXECUTION_TRIGGERED,
		metadata: {
			toolName: name,
			responseTime: `${(Date.now() - requestStartTimestamp) / 1000}s`
		}
	});

	return { type: name as ToolResult['type'], result };
};
