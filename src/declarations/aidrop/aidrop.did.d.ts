import type { ActorMethod } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

export type CanisterError =
	| { NoChildrenForCode: null }
	| { CannotRegisterMultipleTimes: null }
	| { CanisterKilled: null }
	| { GeneralError: string }
	| { Unauthorized: null }
	| { CodeAlreadyRedeemed: null }
	| { CodeNotFound: null }
	| { NoCodeForII: null };
export interface EthAddressAmount {
	eth_address: string;
	amount: bigint;
}
export interface RedeemInput {
	ii: string;
	code: string;
	eth_address: string;
}
export type Result = { Ok: Array<string> } | { Err: CanisterError };
export type Result_1 = { Ok: Array<EthAddressAmount> } | { Err: CanisterError };
export type Result_2 = { Ok: boolean } | { Err: CanisterError };
export type Result_3 = { Ok: null } | { Err: CanisterError };
export interface _SERVICE {
	generate_codes_seed: ActorMethod<[bigint, bigint], Result>;
	get_children_codes_for_ii: ActorMethod<[string], Result>;
	get_eth_addresses_and_amounts: ActorMethod<[], Result_1>;
	has_redeemed: ActorMethod<[string], Result_2>;
	kill_canister: ActorMethod<[Principal], Result_3>;
	redeem_code: ActorMethod<[RedeemInput], Result_3>;
}
