import type { chat_message_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import {
	AI_ASSISTANT_LLM_MODEL,
	getAiAssistantToolsDescription
} from '$lib/constants/ai-assistant.constants';
import {
	AI_ASSISTANT_TEXTUAL_RESPONSE_RECEIVED,
	AI_ASSISTANT_TOOL_EXECUTION_TRIGGERED
} from '$lib/constants/analytics.contants';
import { extendedAddressContacts as extendedAddressContactsStore } from '$lib/derived/contacts.derived';
import { enabledTokens, enabledUniqueTokensSymbols } from '$lib/derived/tokens.derived';
import { trackEvent } from '$lib/services/analytics.services';
import {
	ToolResultType,
	type ChatMessageContent,
	type ToolCall,
	type ToolResult
} from '$lib/types/ai-assistant';
import {
	generateAiAssistantResponseEventMetadata,
	parseReviewSendTokensToolArguments,
	parseShowFilteredContactsToolArguments
} from '$lib/utils/ai-assistant.utils';
import type { Identity } from '@dfinity/agent';
import { fromNullable, nonNullish, toNullable } from '@dfinity/utils';
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
			const result = executeTool({ toolCall, requestStartTimestamp });

			nonNullish(result) && toolResults.push(result);
		}
	} else {
		trackEvent({
			name: AI_ASSISTANT_TEXTUAL_RESPONSE_RECEIVED,
			metadata: generateAiAssistantResponseEventMetadata({ requestStartTimestamp })
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
 * Executes a tool based on the name param returned by LLM.
 *
 * @async
 * @param {Object} params - The parameters required to launch a tool.
 * @param {Array} params.toolCall - A tool call description object returned by LLM.
 * @returns {ToolResult | undefined} - Returns a tool result or undefined if tool name is unknown.
 */
export const executeTool = ({
	toolCall,
	requestStartTimestamp
}: {
	toolCall: ToolCall;
	requestStartTimestamp: number;
}): ToolResult | undefined => {
	const {
		function: { name, arguments: filterParams }
	} = toolCall;

	let result: ToolResult['result'] | undefined;

	if (name === ToolResultType.SHOW_ALL_CONTACTS) {
		result = { contacts: Object.values(get(extendedAddressContactsStore)) };
	} else if (name === ToolResultType.SHOW_FILTERED_CONTACTS) {
		result = parseShowFilteredContactsToolArguments({
			filterParams,
			extendedAddressContacts: get(extendedAddressContactsStore)
		});
	} else if (name === ToolResultType.REVIEW_SEND_TOKENS) {
		result = parseReviewSendTokensToolArguments({
			filterParams,
			extendedAddressContacts: get(extendedAddressContactsStore),
			tokens: get(enabledTokens)
		});
	}

	trackEvent({
		name: AI_ASSISTANT_TOOL_EXECUTION_TRIGGERED,
		metadata: generateAiAssistantResponseEventMetadata({ toolName: name, requestStartTimestamp })
	});

	return { type: name as ToolResult['type'], result };
};
