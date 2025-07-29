import type { ContactUi } from '$lib/types/contact';

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

export interface ToolResult {
	type: 'show_contacts';
	result: ContactUi[];
}
