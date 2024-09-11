import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export type Arg = { Upgrade: null } | { Init: InitArg };
export type BitcoinNetwork = { mainnet: null } | { regtest: null } | { testnet: null };
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
export interface Config {
	ecdsa_key_name: string;
	ic_root_key_raw: [] | [Uint8Array | number[]];
}
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
	ic_root_key_der: [] | [Uint8Array | number[]];
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
export interface _SERVICE {
	caller_btc_address: ActorMethod<[BitcoinNetwork], string>;
	caller_btc_balance: ActorMethod<[BitcoinNetwork], bigint>;
	caller_eth_address: ActorMethod<[], string>;
	config: ActorMethod<[], Config>;
	eth_address_of: ActorMethod<[Principal], string>;
	get_canister_status: ActorMethod<[], CanisterStatusResultV2>;
	http_request: ActorMethod<[HttpRequest], HttpResponse>;
	personal_sign: ActorMethod<[string], string>;
	sign_prehash: ActorMethod<[string], string>;
	sign_transaction: ActorMethod<[SignRequest], string>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
