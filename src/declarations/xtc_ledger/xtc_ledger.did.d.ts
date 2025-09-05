import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export type BurnError =
	| { InsufficientBalance: null }
	| { InvalidTokenContract: null }
	| { NotSufficientLiquidity: null };
export type BurnResult = { Ok: TransactionId } | { Err: BurnError };
export type CreateResult = { Ok: { canister_id: Principal } } | { Err: string };
export interface Event {
	fee: bigint;
	status: TransactionStatus;
	kind: EventDetail;
	cycles: bigint;
	timestamp: bigint;
}
export type EventDetail =
	| {
			Approve: { to: Principal; from: Principal };
	  }
	| { Burn: { to: Principal; from: Principal } }
	| { Mint: { to: Principal } }
	| { CanisterCreated: { from: Principal; canister: Principal } }
	| {
			CanisterCalled: {
				from: Principal;
				method_name: string;
				canister: Principal;
			};
	  }
	| { Transfer: { to: Principal; from: Principal } }
	| {
			TransferFrom: {
				to: Principal;
				from: Principal;
				caller: Principal;
			};
	  };
export interface EventsConnection {
	data: Array<Event>;
	next_offset: TransactionId;
	next_canister_id: [] | [Principal];
}
export interface Metadata {
	fee: bigint;
	decimals: number;
	owner: Principal;
	logo: string;
	name: string;
	totalSupply: bigint;
	symbol: string;
}
export type MintError = { NotSufficientLiquidity: null };
export type MintResult = { Ok: TransactionId } | { Err: MintError };
export type Operation =
	| { transferFrom: null }
	| { burn: null }
	| { mint: null }
	| { approve: null }
	| { canisterCalled: null }
	| { transfer: null }
	| { canisterCreated: null };
export type ResultCall = { Ok: { return: Uint8Array | number[] } } | { Err: string };
export type ResultSend = { Ok: null } | { Err: string };
export interface Stats {
	fee: bigint;
	transfers_count: bigint;
	balance: bigint;
	mints_count: bigint;
	transfers_from_count: bigint;
	canisters_created_count: bigint;
	supply: bigint;
	burns_count: bigint;
	approvals_count: bigint;
	proxy_calls_count: bigint;
	history_events: bigint;
}
export type Time = bigint;
export type TransactionId = bigint;
export type TransactionStatus = { FAILED: null } | { SUCCEEDED: null };
export type TxError =
	| { NotifyDfxFailed: null }
	| { InsufficientAllowance: null }
	| { UnexpectedCyclesResponse: null }
	| { InsufficientBalance: null }
	| { InsufficientXTCFee: null }
	| { ErrorOperationStyle: null }
	| { Unauthorized: null }
	| { LedgerTrap: null }
	| { ErrorTo: null }
	| { Other: null }
	| { FetchRateFailed: null }
	| { BlockUsed: null }
	| { AmountTooSmall: null };
export type TxReceipt = { Ok: bigint } | { Err: TxError };
export type TxReceiptLegacy =
	| { Ok: bigint }
	| {
			Err: { InsufficientAllowance: null } | { InsufficientBalance: null };
	  };
export interface TxRecord {
	op: Operation;
	to: Principal;
	fee: bigint;
	status: TransactionStatus;
	from: Principal;
	timestamp: Time;
	caller: [] | [Principal];
	index: bigint;
	amount: bigint;
}
export interface _SERVICE {
	allowance: ActorMethod<[Principal, Principal], bigint>;
	approve: ActorMethod<[Principal, bigint], TxReceipt>;
	balance: ActorMethod<[[] | [Principal]], bigint>;
	balanceOf: ActorMethod<[Principal], bigint>;
	burn: ActorMethod<[{ canister_id: Principal; amount: bigint }], BurnResult>;
	decimals: ActorMethod<[], number>;
	events: ActorMethod<[{ offset: [] | [bigint]; limit: number }], EventsConnection>;
	getBlockUsed: ActorMethod<[], BigUint64Array | bigint[]>;
	getMetadata: ActorMethod<[], Metadata>;
	getTransaction: ActorMethod<[bigint], TxRecord>;
	getTransactions: ActorMethod<[bigint, bigint], Array<TxRecord>>;
	get_map_block_used: ActorMethod<[bigint], [] | [bigint]>;
	get_transaction: ActorMethod<[TransactionId], [] | [Event]>;
	halt: ActorMethod<[], undefined>;
	historySize: ActorMethod<[], bigint>;
	isBlockUsed: ActorMethod<[bigint], boolean>;
	logo: ActorMethod<[], string>;
	mint: ActorMethod<[Principal, bigint], MintResult>;
	mint_by_icp: ActorMethod<[[] | [Uint8Array | number[]], bigint], TxReceipt>;
	mint_by_icp_recover: ActorMethod<[[] | [Uint8Array | number[]], bigint, Principal], TxReceipt>;
	name: ActorMethod<[], string>;
	nameErc20: ActorMethod<[], string>;
	stats: ActorMethod<[], Stats>;
	symbol: ActorMethod<[], string>;
	totalSupply: ActorMethod<[], bigint>;
	transfer: ActorMethod<[Principal, bigint], TxReceipt>;
	transferErc20: ActorMethod<[Principal, bigint], TxReceiptLegacy>;
	transferFrom: ActorMethod<[Principal, Principal, bigint], TxReceipt>;
	wallet_balance: ActorMethod<[], { amount: bigint }>;
	wallet_call: ActorMethod<
		[
			{
				args: Uint8Array | number[];
				cycles: bigint;
				method_name: string;
				canister: Principal;
			}
		],
		ResultCall
	>;
	wallet_create_canister: ActorMethod<
		[{ controller: [] | [Principal]; cycles: bigint }],
		CreateResult
	>;
	wallet_create_wallet: ActorMethod<
		[{ controller: [] | [Principal]; cycles: bigint }],
		CreateResult
	>;
	wallet_send: ActorMethod<[{ canister: Principal; amount: bigint }], ResultSend>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
