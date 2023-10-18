import type { ActorMethod } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

export type Arg = { Upgrade: null } | { Init: InitArg };
export interface CanisterStatusResultV2 {
	controller: Principal;
	status: CanisterStatusType;
	freezing_threshold: bigint;
	balance: Array<[Uint8Array | number[], bigint]>;
	memory_size: bigint;
	cycles: bigint;
	settings: DefiniteCanisterSettingsArgs;
	idle_cycles_burned_per_day: bigint;
	module_hash: [] | [Uint8Array | number[]];
}
export type CanisterStatusType = { stopped: null } | { stopping: null } | { running: null };
export interface DefiniteCanisterSettingsArgs {
	controller: Principal;
	freezing_threshold: bigint;
	controllers: Array<Principal>;
	memory_allocation: bigint;
	compute_allocation: bigint;
}
export interface HttpRequest {
	url: string;
	method: string;
	body: Uint8Array | number[];
	headers: Array<[string, string]>;
}
export interface HttpResponse {
	body: Uint8Array | number[];
	headers: Array<[string, string]>;
	status_code: number;
}
export interface InitArg {
	ecdsa_key_name: string;
	allowed_callers: Array<Principal>;
}
export interface SignRequest {
	to: string;
	gas: bigint;
	value: bigint;
	max_priority_fee_per_gas: bigint;
	data: [] | [string];
	max_fee_per_gas: bigint;
	chain_id: bigint;
	nonce: bigint;
}
export interface Token {
	decimals: [] | [number];
	chain_id: bigint;
	contract_address: string;
	symbol: [] | [string];
}
export interface _SERVICE {
	add_user_token: ActorMethod<[Token], undefined>;
	caller_eth_address: ActorMethod<[], string>;
	eth_address_of: ActorMethod<[Principal], string>;
	get_canister_status: ActorMethod<[], CanisterStatusResultV2>;
	http_request: ActorMethod<[HttpRequest], HttpResponse>;
	list_user_tokens: ActorMethod<[], Array<Token>>;
	personal_sign: ActorMethod<[string], string>;
	sign_prehash: ActorMethod<[string], string>;
	sign_transaction: ActorMethod<[SignRequest], string>;
}
