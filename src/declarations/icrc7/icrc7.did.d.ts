/* eslint-disable */

// @ts-nocheck

// ICRC-7 Non-Fungible Token Standard bindings.
// Hand-authored to match src/declarations/icrc7/icrc7.did until icrc7 is wired into
// scripts/generate.sh; re-running `npm run generate` will overwrite this file.

import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export type Subaccount = Uint8Array;

export interface Account {
	owner: Principal;
	subaccount: [] | [Subaccount];
}

export type Value =
	| { Blob: Uint8Array }
	| { Text: string }
	| { Nat: bigint }
	| { Int: bigint }
	| { Array: Array<Value> }
	| { Map: Array<[string, Value]> };

export interface TransferArg {
	from_subaccount: [] | [Subaccount];
	to: Account;
	token_id: bigint;
	memo: [] | [Uint8Array];
	created_at_time: [] | [bigint];
}

export type TransferError =
	| { NonExistingTokenId: null }
	| { InvalidRecipient: null }
	| { Unauthorized: null }
	| { TooOld: null }
	| { CreatedInFuture: { ledger_time: bigint } }
	| { Duplicate: { duplicate_of: bigint } }
	| { GenericError: { error_code: bigint; message: string } }
	| { GenericBatchError: { error_code: bigint; message: string } };

export type TransferResult = { Ok: bigint } | { Err: TransferError };

export interface StandardRecord {
	name: string;
	url: string;
}

export interface _SERVICE {
	icrc7_collection_metadata: ActorMethod<[], Array<[string, Value]>>;
	icrc7_symbol: ActorMethod<[], string>;
	icrc7_name: ActorMethod<[], string>;
	icrc7_description: ActorMethod<[], [] | [string]>;
	icrc7_logo: ActorMethod<[], [] | [string]>;
	icrc7_total_supply: ActorMethod<[], bigint>;
	icrc7_supply_cap: ActorMethod<[], [] | [bigint]>;
	icrc7_max_query_batch_size: ActorMethod<[], [] | [bigint]>;
	icrc7_max_update_batch_size: ActorMethod<[], [] | [bigint]>;
	icrc7_default_take_value: ActorMethod<[], [] | [bigint]>;
	icrc7_max_take_value: ActorMethod<[], [] | [bigint]>;
	icrc7_max_memo_size: ActorMethod<[], [] | [bigint]>;
	icrc7_atomic_batch_transfers: ActorMethod<[], [] | [boolean]>;
	icrc7_tx_window: ActorMethod<[], [] | [bigint]>;
	icrc7_permitted_drift: ActorMethod<[], [] | [bigint]>;
	icrc7_token_metadata: ActorMethod<[Array<bigint>], Array<[] | [Array<[string, Value]>]>>;
	icrc7_owner_of: ActorMethod<[Array<bigint>], Array<[] | [Account]>>;
	icrc7_balance_of: ActorMethod<[Array<Account>], Array<bigint>>;
	icrc7_tokens: ActorMethod<[[] | [bigint], [] | [bigint]], Array<bigint>>;
	icrc7_tokens_of: ActorMethod<[Account, [] | [bigint], [] | [bigint]], Array<bigint>>;
	icrc7_transfer: ActorMethod<[Array<TransferArg>], Array<[] | [TransferResult]>>;
	icrc10_supported_standards: ActorMethod<[], Array<StandardRecord>>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
