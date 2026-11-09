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
import { aiAssistantChatMessages } from '$lib/derived/ai-assistant.derived';
import { enabledMainnetTotalUsdBalance } from '$lib/derived/balances.derived';
import { extendedAddressContacts as extendedAddressContactsStore } from '$lib/derived/contacts.derived';
import { networks } from '$lib/derived/networks.derived';
import { enabledMainnetFungibleTokensUi } from '$lib/derived/tokens-ui.derived';
import { enabledTokens, enabledUniqueFungibleTokensSymbols } from '$lib/derived/tokens.derived';
import { trackEvent } from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import {
	ToolResultType,
	type ChatMessageContent,
	type ToolCall,
	type ToolResult
} from '$lib/types/ai-assistant';
import {
	generateAiAssistantResponseEventMetadata,
	isAddressTypedByUser,
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
					enabledNetworksSymbols: get(enabledUniqueFungibleTokensSymbols),
					enabledTokensSymbols: get(enabledUniqueFungibleTokensSymbols)
				})
			)
		},
		identity
	});
	const toolResults: ToolResult[] = [];
	let sendAddressRequested = false;
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

				if (nonNullish(result)) {
					toolResults.push(result);
				} else {
					sendAddressRequested = true;
				}

				toolCallsCounters[toolType] += 1;
			}
		}
	} else {
		trackEvent({
			name: AI_ASSISTANT_TEXTUAL_RESPONSE_RECEIVED,
			metadata: generateAiAssistantResponseEventMetadata({ requestStartTimestamp })
		});
	}

	// The address request is shown next to any other tool results, so the model's own text is kept only for responses without them.
	return {
		text: sendAddressRequested
			? get(i18n).ai_assistant.text.type_send_address_message
			: toolResults.length > 0
				? undefined
				: fromNullable(content),
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
 * @returns {ToolResult | undefined} - Returns a tool result, or undefined if a send review needs an address the user has not typed in the chat yet.
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
	let sendAddressRequested = false;

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
			networks: get(networks),
			totalUsdBalance: get(enabledMainnetTotalUsdBalance)
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
		} else if (
			isNullish(result.contactAddress) &&
			!isAddressTypedByUser({ address: result.address, messages: get(aiAssistantChatMessages) })
		) {
			// Outside the contacts, a send goes only to an address the user typed in this chat; the model's own choice of address is never used. The user is asked to type it instead.
			result = undefined;
			sendAddressRequested = true;
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

	if (sendAddressRequested) {
		return;
	}

	return { type: name as ToolResult['type'], result };
};
