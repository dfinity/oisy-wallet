import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type AddLiquiditAmountsResult = { Ok: AddLiquidityAmountsReply } | { Err: string };
export interface AddLiquidityAmountsReply {
	add_lp_token_amount: bigint;
	amount_0: bigint;
	amount_1: bigint;
	address_0: string;
	address_1: string;
	symbol_0: string;
	symbol_1: string;
	chain_0: string;
	chain_1: string;
	symbol: string;
	fee_0: bigint;
	fee_1: bigint;
}
export interface AddLiquidityArgs {
	token_0: string;
	token_1: string;
	amount_0: bigint;
	amount_1: bigint;
	tx_id_0: [] | [TxId];
	tx_id_1: [] | [TxId];
}
export type AddLiquidityAsyncResult = { Ok: bigint } | { Err: string };
export interface AddLiquidityReply {
	ts: bigint;
	request_id: bigint;
	status: string;
	tx_id: bigint;
	add_lp_token_amount: bigint;
	transfer_ids: Array<TransferIdReply>;
	amount_0: bigint;
	amount_1: bigint;
	claim_ids: BigUint64Array | bigint[];
	address_0: string;
	address_1: string;
	symbol_0: string;
	symbol_1: string;
	chain_0: string;
	chain_1: string;
	symbol: string;
}
export type AddLiquidityResult = { Ok: AddLiquidityReply } | { Err: string };
export interface AddPoolArgs {
	token_0: string;
	token_1: string;
	amount_0: bigint;
	amount_1: bigint;
	tx_id_0: [] | [TxId];
	tx_id_1: [] | [TxId];
	lp_fee_bps: [] | [number];
}
export interface AddPoolReply {
	ts: bigint;
	request_id: bigint;
	status: string;
	tx_id: bigint;
	lp_token_symbol: string;
	add_lp_token_amount: bigint;
	transfer_ids: Array<TransferIdReply>;
	name: string;
	amount_0: bigint;
	amount_1: bigint;
	claim_ids: BigUint64Array | bigint[];
	address_0: string;
	address_1: string;
	symbol_0: string;
	symbol_1: string;
	pool_id: number;
	chain_0: string;
	chain_1: string;
	is_removed: boolean;
	symbol: string;
	lp_fee_bps: number;
}
export type AddPoolResult = { Ok: AddPoolReply } | { Err: string };
export interface AddTokenArgs {
	token: string;
}
export type AddTokenReply = { IC: ICTokenReply };
export type AddTokenResult = { Ok: AddTokenReply } | { Err: string };
export interface CheckPoolsReply {
	expected_balance: ExpectedBalance;
	diff_balance: bigint;
	actual_balance: bigint;
	symbol: string;
}
export type CheckPoolsResult = { Ok: Array<CheckPoolsReply> } | { Err: string };
export interface ClaimReply {
	ts: bigint;
	fee: bigint;
	status: string;
	claim_id: bigint;
	transfer_ids: Array<TransferIdReply>;
	desc: string;
	chain: string;
	canister_id: [] | [string];
	to_address: string;
	amount: bigint;
	symbol: string;
}
export type ClaimResult = { Ok: ClaimReply } | { Err: string };
export interface ClaimsReply {
	ts: bigint;
	fee: bigint;
	status: string;
	claim_id: bigint;
	desc: string;
	chain: string;
	canister_id: [] | [string];
	to_address: string;
	amount: bigint;
	symbol: string;
}
export type ClaimsResult = { Ok: Array<ClaimsReply> } | { Err: string };
export interface ExpectedBalance {
	balance: bigint;
	pool_balances: Array<PoolExpectedBalance>;
	unclaimed_claims: bigint;
}
export interface ICTokenReply {
	fee: bigint;
	decimals: number;
	token_id: number;
	chain: string;
	name: string;
	canister_id: string;
	icrc1: boolean;
	icrc2: boolean;
	icrc3: boolean;
	is_removed: boolean;
	symbol: string;
}
export interface ICTransferReply {
	is_send: boolean;
	block_index: bigint;
	chain: string;
	canister_id: string;
	amount: bigint;
	symbol: string;
}
export interface Icrc10SupportedStandards {
	url: string;
	name: string;
}
export interface Icrc28TrustedOriginsResponse {
	trusted_origins: Array<string>;
}
export interface LPBalancesReply {
	ts: bigint;
	usd_balance: number;
	balance: number;
	name: string;
	amount_0: number;
	amount_1: number;
	address_0: string;
	address_1: string;
	symbol_0: string;
	symbol_1: string;
	usd_amount_0: number;
	usd_amount_1: number;
	chain_0: string;
	chain_1: string;
	symbol: string;
	lp_token_id: bigint;
}
export interface LPTokenReply {
	fee: bigint;
	decimals: number;
	token_id: number;
	chain: string;
	name: string;
	address: string;
	pool_id_of: number;
	is_removed: boolean;
	total_supply: bigint;
	symbol: string;
}
export interface MessagesReply {
	ts: bigint;
	title: string;
	message: string;
	message_id: bigint;
}
export type MessagesResult = { Ok: Array<MessagesReply> } | { Err: string };
export interface PoolExpectedBalance {
	balance: bigint;
	kong_fee: bigint;
	pool_symbol: string;
	lp_fee: bigint;
}
export interface PoolReply {
	lp_token_symbol: string;
	name: string;
	lp_fee_0: bigint;
	lp_fee_1: bigint;
	balance_0: bigint;
	balance_1: bigint;
	address_0: string;
	address_1: string;
	symbol_0: string;
	symbol_1: string;
	pool_id: number;
	price: number;
	chain_0: string;
	chain_1: string;
	is_removed: boolean;
	symbol: string;
	lp_fee_bps: number;
}
export type PoolsResult = { Ok: Array<PoolReply> } | { Err: string };
export interface RemoveLiquidityAmountsReply {
	lp_fee_0: bigint;
	lp_fee_1: bigint;
	amount_0: bigint;
	amount_1: bigint;
	address_0: string;
	address_1: string;
	symbol_0: string;
	symbol_1: string;
	chain_0: string;
	chain_1: string;
	remove_lp_token_amount: bigint;
	symbol: string;
}
export type RemoveLiquidityAmountsResult =
	| {
			Ok: RemoveLiquidityAmountsReply;
	  }
	| { Err: string };
export interface RemoveLiquidityArgs {
	token_0: string;
	token_1: string;
	remove_lp_token_amount: bigint;
}
export type RemoveLiquidityAsyncResult = { Ok: bigint } | { Err: string };
export interface RemoveLiquidityReply {
	ts: bigint;
	request_id: bigint;
	status: string;
	tx_id: bigint;
	transfer_ids: Array<TransferIdReply>;
	lp_fee_0: bigint;
	lp_fee_1: bigint;
	amount_0: bigint;
	amount_1: bigint;
	claim_ids: BigUint64Array | bigint[];
	address_0: string;
	address_1: string;
	symbol_0: string;
	symbol_1: string;
	chain_0: string;
	chain_1: string;
	remove_lp_token_amount: bigint;
	symbol: string;
}
export type RemoveLiquidityResult = { Ok: RemoveLiquidityReply } | { Err: string };
export type RequestReply =
	| { AddLiquidity: AddLiquidityReply }
	| { Swap: SwapReply }
	| { AddPool: AddPoolReply }
	| { RemoveLiquidity: RemoveLiquidityReply }
	| { Pending: null };
export type RequestRequest =
	| { AddLiquidity: AddLiquidityArgs }
	| { Swap: SwapArgs }
	| { AddPool: AddPoolArgs }
	| { RemoveLiquidity: RemoveLiquidityArgs };
export interface RequestsReply {
	ts: bigint;
	request_id: bigint;
	request: RequestRequest;
	statuses: Array<string>;
	reply: RequestReply;
}
export type RequestsResult = { Ok: Array<RequestsReply> } | { Err: string };
export interface SendArgs {
	token: string;
	to_address: string;
	amount: bigint;
}
export interface SendReply {
	ts: bigint;
	request_id: bigint;
	status: string;
	tx_id: bigint;
	chain: string;
	to_address: string;
	amount: bigint;
	symbol: string;
}
export type SendResult = { OK: SendReply } | { Err: string };
export interface SwapAmountsReply {
	txs: Array<SwapAmountsTxReply>;
	receive_chain: string;
	mid_price: number;
	pay_amount: bigint;
	receive_amount: bigint;
	pay_symbol: string;
	receive_symbol: string;
	receive_address: string;
	pay_address: string;
	price: number;
	pay_chain: string;
	slippage: number;
}
export type SwapAmountsResult = { Ok: SwapAmountsReply } | { Err: string };
export interface SwapAmountsTxReply {
	receive_chain: string;
	pay_amount: bigint;
	receive_amount: bigint;
	pay_symbol: string;
	receive_symbol: string;
	receive_address: string;
	pool_symbol: string;
	pay_address: string;
	price: number;
	pay_chain: string;
	lp_fee: bigint;
	gas_fee: bigint;
}
export interface SwapArgs {
	receive_token: string;
	max_slippage: [] | [number];
	pay_amount: bigint;
	referred_by: [] | [string];
	receive_amount: [] | [bigint];
	receive_address: [] | [string];
	pay_token: string;
	pay_tx_id: [] | [TxId];
}
export type SwapAsyncResult = { Ok: bigint } | { Err: string };
export interface SwapReply {
	ts: bigint;
	txs: Array<SwapTxReply>;
	request_id: bigint;
	status: string;
	tx_id: bigint;
	transfer_ids: Array<TransferIdReply>;
	receive_chain: string;
	mid_price: number;
	pay_amount: bigint;
	receive_amount: bigint;
	claim_ids: BigUint64Array | bigint[];
	pay_symbol: string;
	receive_symbol: string;
	receive_address: string;
	pay_address: string;
	price: number;
	pay_chain: string;
	slippage: number;
}
export type SwapResult = { Ok: SwapReply } | { Err: string };
export interface SwapTxReply {
	ts: bigint;
	receive_chain: string;
	pay_amount: bigint;
	receive_amount: bigint;
	pay_symbol: string;
	receive_symbol: string;
	receive_address: string;
	pool_symbol: string;
	pay_address: string;
	price: number;
	pay_chain: string;
	lp_fee: bigint;
	gas_fee: bigint;
}
export type TokenReply = { IC: ICTokenReply } | { LP: LPTokenReply };
export type TokensResult = { Ok: Array<TokenReply> } | { Err: string };
export interface TransferIdReply {
	transfer_id: bigint;
	transfer: TransferReply;
}
export type TransferReply = { IC: ICTransferReply };
export type TransfersResult = { Ok: Array<TransferIdReply> } | { Err: string };
export type TxId = { TransactionId: string } | { BlockIndex: bigint };
export type TxsReply =
	| { AddLiquidity: AddLiquidityReply }
	| { Swap: SwapReply }
	| { AddPool: AddPoolReply }
	| { RemoveLiquidity: RemoveLiquidityReply };
export type TxsResult = { Ok: Array<TxsReply> } | { Err: string };
export interface UpdateTokenArgs {
	token: string;
}
export type UpdateTokenReply = { IC: ICTokenReply };
export type UpdateTokenResult = { Ok: UpdateTokenReply } | { Err: string };
export type UserBalancesReply = { LP: LPBalancesReply };
export type UserBalancesResult = { Ok: Array<UserBalancesReply> } | { Err: string };
export interface UserReply {
	account_id: string;
	fee_level_expires_at: [] | [bigint];
	referred_by: [] | [string];
	user_id: number;
	fee_level: number;
	principal_id: string;
	referred_by_expires_at: [] | [bigint];
	my_referral_code: string;
}
export type UserResult = { Ok: UserReply } | { Err: string };
export type ValidateAddLiquidityResult = { Ok: string } | { Err: string };
export type ValidateRemoveLiquidityResult = { Ok: string } | { Err: string };
export interface icrc21_consent_info {
	metadata: icrc21_consent_message_metadata;
	consent_message: icrc21_consent_message;
}
export type icrc21_consent_message =
	| {
			LineDisplayMessage: { pages: Array<{ lines: Array<string> }> };
	  }
	| { GenericDisplayMessage: string };
export interface icrc21_consent_message_metadata {
	utc_offset_minutes: [] | [number];
	language: string;
}
export interface icrc21_consent_message_request {
	arg: Uint8Array | number[];
	method: string;
	user_preferences: icrc21_consent_message_spec;
}
export type icrc21_consent_message_response = { Ok: icrc21_consent_info } | { Err: icrc21_error };
export interface icrc21_consent_message_spec {
	metadata: icrc21_consent_message_metadata;
	device_spec:
		| []
		| [
				| { GenericDisplay: null }
				| {
						LineDisplay: {
							characters_per_line: number;
							lines_per_page: number;
						};
				  }
		  ];
}
export type icrc21_error =
	| {
			GenericError: { description: string; error_code: bigint };
	  }
	| { InsufficientPayment: icrc21_error_info }
	| { UnsupportedCanisterCall: icrc21_error_info }
	| { ConsentMessageUnavailable: icrc21_error_info };
export interface icrc21_error_info {
	description: string;
}
export interface _SERVICE {
	add_liquidity: ActorMethod<[AddLiquidityArgs], AddLiquidityResult>;
	add_liquidity_amounts: ActorMethod<[string, bigint, string], AddLiquiditAmountsResult>;
	add_liquidity_async: ActorMethod<[AddLiquidityArgs], AddLiquidityAsyncResult>;
	add_pool: ActorMethod<[AddPoolArgs], AddPoolResult>;
	add_token: ActorMethod<[AddTokenArgs], AddTokenResult>;
	check_pools: ActorMethod<[], CheckPoolsResult>;
	claim: ActorMethod<[bigint], ClaimResult>;
	claims: ActorMethod<[string], ClaimsResult>;
	get_user: ActorMethod<[], UserResult>;
	icrc10_supported_standards: ActorMethod<[], Array<Icrc10SupportedStandards>>;
	icrc1_name: ActorMethod<[], string>;
	icrc21_canister_call_consent_message: ActorMethod<
		[icrc21_consent_message_request],
		icrc21_consent_message_response
	>;
	icrc28_trusted_origins: ActorMethod<[], Icrc28TrustedOriginsResponse>;
	pools: ActorMethod<[[] | [string]], PoolsResult>;
	remove_liquidity: ActorMethod<[RemoveLiquidityArgs], RemoveLiquidityResult>;
	remove_liquidity_amounts: ActorMethod<[string, string, bigint], RemoveLiquidityAmountsResult>;
	remove_liquidity_async: ActorMethod<[RemoveLiquidityArgs], RemoveLiquidityAsyncResult>;
	requests: ActorMethod<[[] | [bigint]], RequestsResult>;
	send: ActorMethod<[SendArgs], SendResult>;
	swap: ActorMethod<[SwapArgs], SwapResult>;
	swap_amounts: ActorMethod<[string, bigint, string], SwapAmountsResult>;
	swap_async: ActorMethod<[SwapArgs], SwapAsyncResult>;
	tokens: ActorMethod<[[] | [string]], TokensResult>;
	update_token: ActorMethod<[UpdateTokenArgs], UpdateTokenResult>;
	user_balances: ActorMethod<[string], UserBalancesResult>;
	validate_add_liquidity: ActorMethod<[], ValidateAddLiquidityResult>;
	validate_remove_liquidity: ActorMethod<[], ValidateRemoveLiquidityResult>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
