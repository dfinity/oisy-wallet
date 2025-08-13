import type {
	ContactAddressUiWithId,
	ContactUi,
	ExtendedAddressContactUi
} from '$lib/types/contact';

export interface ChatMessageContent {
	text?: string;
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

export interface ToolResult {
	type: 'show_contacts';
	result: ContactUi[];
}

export interface AiAssistantContactUi
	extends Omit<ExtendedAddressContactUi, 'addresses' | 'image' | 'updateTimestampNs'> {
	addresses: Omit<ContactAddressUiWithId, 'address'>[];
}

export type AiAssistantContactUiMap = Record<string, AiAssistantContactUi>;
