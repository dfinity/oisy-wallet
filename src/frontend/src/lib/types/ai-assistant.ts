import type { Address } from '$lib/types/address';
import type { ContactAddressUiWithId, ExtendedAddressContactUi } from '$lib/types/contact';
import type { Network } from '$lib/types/network';
import type { Token, TokenStandardCode } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';

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

export interface ShowBalanceToolResult {
	mainCard: {
		totalUsdBalance: number;
		token?: TokenUi;
		network?: Network;
	};
	secondaryCards?: TokenUi[];
}

export enum ToolResultType {
	SHOW_ALL_CONTACTS = 'show_all_contacts',
	SHOW_FILTERED_CONTACTS = 'show_filtered_contacts',
	REVIEW_SEND_TOKENS = 'review_send_tokens',
	SHOW_BALANCE = 'show_balance'
}

export interface ToolResult {
	type: ToolResultType;
	result?: ShowContactsToolResult | ReviewSendTokensToolResult | ShowBalanceToolResult;
}

export interface AiAssistantContactUi extends Omit<
	ExtendedAddressContactUi,
	'addresses' | 'image' | 'updateTimestampNs' | 'id'
> {
	addresses: (Omit<ContactAddressUiWithId, 'address'> & {
		acceptedTokenStandards: TokenStandardCode[];
	})[];
}

export type AiAssistantContactUiMap = Record<string, AiAssistantContactUi>;

export type AiAssistantToken = Pick<Token, 'name' | 'symbol' | 'standard'> & {
	networkId: string;
};
