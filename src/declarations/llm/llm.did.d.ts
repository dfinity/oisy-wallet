import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export interface assistant_message {
	content: [] | [string];
	tool_calls: Array<{
		id: string;
		function: { name: string; arguments: Array<tool_call_argument> };
	}>;
}
export type backend_config =
	| { worker: null }
	| { ollama: null }
	| { openrouter: { api_key: string } };
export interface chat_message_v0 {
	content: string;
	role: { user: null } | { assistant: null } | { system: null };
}
export type chat_message_v1 =
	| {
			tool: { content: string; tool_call_id: string };
	  }
	| { user: { content: string } }
	| { assistant: assistant_message }
	| { system: { content: string } };
export interface chat_request_v0 {
	model: string;
	messages: Array<chat_message_v0>;
}
export interface chat_request_v1 {
	model: string;
	tools: [] | [Array<tool>];
	messages: Array<chat_message_v1>;
}
export interface chat_response_v1 {
	message: assistant_message;
}
export interface config {
	workers_whitelist: { all: null } | { some: Array<Principal> };
	api_disabled: boolean;
}
export interface parameters {
	type: string;
	properties: [] | [Array<property>];
	required: [] | [Array<string>];
}
export interface property {
	enum: [] | [Array<string>];
	name: string;
	type: string;
	description: [] | [string];
}
export type tool = {
	function: {
		name: string;
		parameters: [] | [parameters];
		description: [] | [string];
	};
};
export interface tool_call_argument {
	value: string;
	name: string;
}
export interface _SERVICE {
	v0_chat: ActorMethod<[chat_request_v0], string>;
	v1_chat: ActorMethod<[chat_request_v1], chat_response_v1>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
