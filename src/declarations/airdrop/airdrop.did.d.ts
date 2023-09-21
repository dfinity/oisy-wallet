import type { ActorMethod } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

export type Arg = { Upgrade: null } | { Init: InitArg };
export type CanisterError =
	| { NoChildrenForCode: null }
	| { CannotRegisterMultipleTimes: null }
	| { CanisterKilled: null }
	| { GeneralError: string }
	| { UnknownOisyWalletAddress: null }
	| { NoMoreCodes: null }
	| { MaximumDepthReached: null }
	| { CodeAlreadyRedeemed: null }
	| { CodeNotFound: null }
	| { NoCodeForII: null };
export interface CodeInfo {
	codes_generated: bigint;
	code: string;
	codes_redeemed: bigint;
}
export interface Info {
	principal: Principal;
	code: string;
	ethereum_address: string;
	children: [] | [Array<[string, boolean]>];
}
export interface InitArg {
	backend_canister_id: Principal;
}
export type Result = { Ok: null } | { Err: CanisterError };
export type Result_1 = { Ok: CodeInfo } | { Err: CanisterError };
export type Result_2 = { Ok: Info } | { Err: CanisterError };
export interface _SERVICE {
	add_admin: ActorMethod<[Principal], Result>;
	add_codes: ActorMethod<[Array<string>], Result>;
	add_manager: ActorMethod<[Principal, string], Result>;
	bring_caninster_back_to_life: ActorMethod<[], Result>;
	generate_code: ActorMethod<[], Result_1>;
	get_code: ActorMethod<[], Result_2>;
	is_manager: ActorMethod<[], boolean>;
	kill_canister: ActorMethod<[], Result>;
	redeem_code: ActorMethod<[string], Result_2>;
}
