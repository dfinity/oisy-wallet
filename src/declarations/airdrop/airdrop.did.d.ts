import type { ActorMethod } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

export type CanisterError =
	| { NoChildrenForCode: null }
	| { CannotRegisterMultipleTimes: null }
	| { CanisterKilled: null }
	| { GeneralError: string }
	| { Unauthorized: string }
	| { CodeAlreadyRedeemed: null }
	| { CodeNotFound: null }
	| { NoCodeForII: null };
export interface Info {
	principal: Principal;
	code: string;
	ethereum_address: string;
	children: [] | [Array<[string, boolean]>];
}
export type Result = { Ok: string } | { Err: CanisterError };
export type Result_1 = { Ok: Info } | { Err: CanisterError };
export interface _SERVICE {
	generate_code: ActorMethod<[], Result>;
	get_code: ActorMethod<[], Result_1>;
	redeem_code: ActorMethod<[string, string], Result_1>;
}
