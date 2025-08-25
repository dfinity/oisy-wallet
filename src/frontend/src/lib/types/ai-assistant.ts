import type { ContactAddressUiWithId, ExtendedAddressContactUi } from '$lib/types/contact';

export interface ChatMessageContent {
	text?: string;
	context?: string;
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
	message?: string;
}

export interface ToolResult {
	type: 'show_contacts' | 'review_send_tokens';
	result?: ShowContactsToolResult;
}

export interface AiAssistantContactUi
	extends Omit<ExtendedAddressContactUi, 'addresses' | 'image' | 'updateTimestampNs'> {
	addresses: Omit<ContactAddressUiWithId, 'address'>[];
}

export type AiAssistantContactUiMap = Record<string, AiAssistantContactUi>;
