import type {
	ContactAddressUiWithId,
	ContactUi,
	ExtendedAddressContactUi
} from '$lib/types/contact';

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
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
