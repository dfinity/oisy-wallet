import type { chat_message_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import {
	AI_ASSISTANT_LLM_MODEL,
	getAiAssistantToolsDescription,
	TOOL_CALLS_LIMITS
} from '$lib/constants/ai-assistant.constants';
import {
	AI_ASSISTANT_TEXTUAL_RESPONSE_RECEIVED,
	AI_ASSISTANT_TOOL_EXECUTION_TRIGGERED
} from '$lib/constants/analytics.constants';
import { extendedAddressContacts as extendedAddressContactsStore } from '$lib/derived/contacts.derived';
import { networks } from '$lib/derived/networks.derived';
import { enabledMainnetFungibleTokensUi } from '$lib/derived/tokens-ui.derived';
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
	parseShowBalanceToolArguments,
	parseShowFilteredContactsToolArguments
} from '$lib/utils/ai-assistant.utils';
import { fromNullable, isNullish, nonNullish, toNullable } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
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
	const toolCallsCounters: Record<ToolResultType, number> = {
		[ToolResultType.REVIEW_SEND_TOKENS]: 0,
		[ToolResultType.SHOW_BALANCE]: 0,
		[ToolResultType.SHOW_ALL_CONTACTS]: 0,
		[ToolResultType.SHOW_FILTERED_CONTACTS]: 0
	};

	if (nonNullish(tool_calls) && tool_calls.length > 0) {
		for (const toolCall of tool_calls) {
			const toolType = toolCall.function.name as ToolResultType;

			if (toolCallsCounters[toolType] < TOOL_CALLS_LIMITS[toolType]) {
				const result = executeTool({ toolCall, requestStartTimestamp });
				nonNullish(result) && toolResults.push(result);
				toolCallsCounters[toolType] += 1;
			}
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
	let additionalTrackingMetadata: Record<string, string> = {};

	if (name === ToolResultType.SHOW_ALL_CONTACTS) {
		result = { contacts: Object.values(get(extendedAddressContactsStore)) };
	} else if (name === ToolResultType.SHOW_FILTERED_CONTACTS) {
		result = parseShowFilteredContactsToolArguments({
			filterParams,
			extendedAddressContacts: get(extendedAddressContactsStore)
		});
	} else if (name === ToolResultType.SHOW_BALANCE) {
		result = parseShowBalanceToolArguments({
			filterParams,
			tokensUi: get(enabledMainnetFungibleTokensUi),
			networks: get(networks)
		});

		additionalTrackingMetadata = {
			...(nonNullish(result.mainCard.token) && { requestedToken: result.mainCard.token.symbol }),
			...(nonNullish(result.mainCard.network) && { requestedNetwork: result.mainCard.network.name })
		};
	} else if (name === ToolResultType.REVIEW_SEND_TOKENS) {
		result = parseReviewSendTokensToolArguments({
			filterParams,
			extendedAddressContacts: get(extendedAddressContactsStore),
			tokens: get(enabledTokens)
		});

		// Note: both cases should not happen, still we prefer to handle them.
		// 1. If all 3 addresses params are present, we consider it as an invalid parsing result; therefore, it's safer to reset it
		// 2. If the token was not identified, we consider it as an invalid parsing result; therefore, it's safer to reset it
		if (
			isNullish(result) ||
			(result.contactAddress && result.contact && result.address) ||
			isNullish(result.token)
		) {
			result = undefined;
		} else {
			additionalTrackingMetadata = {
				requestedToken: result.token.symbol
			};
		}
	}

	trackEvent({
		name: AI_ASSISTANT_TOOL_EXECUTION_TRIGGERED,
		metadata: generateAiAssistantResponseEventMetadata({
			toolName: name,
			requestStartTimestamp,
			additionalMetadata: additionalTrackingMetadata
		})
	});

	return { type: name as ToolResult['type'], result };
};
