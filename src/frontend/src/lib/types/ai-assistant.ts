import type { Address } from '$lib/types/address';
import type { ContactAddressUiWithId, ExtendedAddressContactUi } from '$lib/types/contact';
import type { Token } from '$lib/types/token';

export interface ChatMessageContent {
	text?: string;
	context?: string;
	retryable?: boolean;
	tool?: {
		calls: ToolCall[];
		results: ToolResult[];
	};
}

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system';
	data: ChatMessageContent;
}

export interface ToolCallArgument {
	name: string;
	value: string;
}

interface ToolFunction {
	name: string;
	arguments: ToolCallArgument[];
}

export interface ToolCall {
	id: string;
	function: ToolFunction;
}

export interface ShowContactsToolResult {
	contacts: ExtendedAddressContactUi[];
}

export interface ReviewSendTokensToolResult {
	amount: number;
	token: Token;
	sendCompleted: boolean;
	id: string;
	contact?: ExtendedAddressContactUi;
	contactAddress?: ContactAddressUiWithId;
	address?: Address;
}

export enum ToolResultType {
	SHOW_ALL_CONTACTS = 'show_all_contacts',
	SHOW_FILTERED_CONTACTS = 'show_filtered_contacts',
	REVIEW_SEND_TOKENS = 'review_send_tokens'
}

export interface ToolResult {
	type: ToolResultType;
	result?: ShowContactsToolResult | ReviewSendTokensToolResult;
}

export interface AiAssistantContactUi
	extends Omit<ExtendedAddressContactUi, 'addresses' | 'image' | 'updateTimestampNs' | 'id'> {
	addresses: Omit<ContactAddressUiWithId, 'address'>[];
}

export type AiAssistantContactUiMap = Record<string, AiAssistantContactUi>;
