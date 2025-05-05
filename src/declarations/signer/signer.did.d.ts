import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Account {
  'owner' : Principal,
  'subaccount' : [] | [Uint8Array | number[]],
}
export type Arg = { 'Upgrade' : null } |
  { 'Init' : InitArg };
export type BitcoinAddressType = { 'P2WPKH' : null };
export type BitcoinNetwork = { 'mainnet' : null } |
  { 'regtest' : null } |
  { 'testnet' : null };
export interface BtcTxOutput {
  'destination_address' : string,
  'sent_satoshis' : bigint,
}
export type BuildP2wpkhTxError = {
    'NotEnoughFunds' : { 'available' : bigint, 'required' : bigint }
  } |
  { 'WrongBitcoinNetwork' : null } |
  { 'NotP2WPKHSourceAddress' : null } |
  { 'InvalidDestinationAddress' : GetAddressResponse } |
  { 'InvalidSourceAddress' : GetAddressResponse };
export interface CallerPaysIcrc2Tokens { 'ledger' : Principal }
export interface CanisterStatusResultV2 {
  'controller' : Principal,
  'status' : CanisterStatusType,
  'freezing_threshold' : bigint,
  'balance' : Array<[Uint8Array | number[], bigint]>,
  'memory_size' : bigint,
  'cycles' : bigint,
  'settings' : DefiniteCanisterSettingsArgs,
  'idle_cycles_burned_per_day' : bigint,
  'module_hash' : [] | [Uint8Array | number[]],
}
export type CanisterStatusType = { 'stopped' : null } |
  { 'stopping' : null } |
  { 'running' : null };
export interface Config {
  'ecdsa_key_name' : string,
  'ic_root_key_raw' : [] | [Uint8Array | number[]],
  'cycles_ledger' : Principal,
}
export interface DefiniteCanisterSettingsArgs {
  'controller' : Principal,
  'freezing_threshold' : bigint,
  'controllers' : Array<Principal>,
  'memory_allocation' : bigint,
  'compute_allocation' : bigint,
}
export type EcdsaCurve = { 'secp256k1' : null };
export interface EcdsaKeyId { 'name' : string, 'curve' : EcdsaCurve }
export interface EcdsaPublicKeyArgument {
  'key_id' : EcdsaKeyId,
  'canister_id' : [] | [Principal],
  'derivation_path' : Array<Uint8Array | number[]>,
}
export interface EcdsaPublicKeyResponse {
  'public_key' : Uint8Array | number[],
  'chain_code' : Uint8Array | number[],
}
export type EthAddressError = { 'SigningError' : [RejectionCode_1, string] } |
  { 'PaymentError' : PaymentError };
export interface EthAddressRequest { 'principal' : [] | [Principal] }
export interface EthAddressResponse { 'address' : string }
export interface EthPersonalSignRequest { 'message' : string }
export interface EthPersonalSignResponse { 'signature' : string }
export interface EthSignPrehashRequest { 'hash' : string }
export interface EthSignPrehashResponse { 'signature' : string }
export interface EthSignTransactionRequest {
  'to' : string,
  'gas' : bigint,
  'value' : bigint,
  'max_priority_fee_per_gas' : bigint,
  'data' : [] | [string],
  'max_fee_per_gas' : bigint,
  'chain_id' : bigint,
  'nonce' : bigint,
}
export type GetAddressError = { 'InternalError' : { 'msg' : string } } |
  { 'PaymentError' : PaymentError };
export interface GetAddressRequest {
  'network' : BitcoinNetwork,
  'address_type' : BitcoinAddressType,
}
export interface GetAddressResponse { 'address' : string }
export interface GetBalanceRequest {
  'network' : BitcoinNetwork,
  'address_type' : BitcoinAddressType,
  'min_confirmations' : [] | [number],
}
export interface GetBalanceResponse { 'balance' : bigint }
export interface HttpRequest {
  'url' : string,
  'method' : string,
  'body' : Uint8Array | number[],
  'headers' : Array<[string, string]>,
}
export interface HttpResponse {
  'body' : Uint8Array | number[],
  'headers' : Array<[string, string]>,
  'status_code' : number,
}
export interface InitArg {
  'ecdsa_key_name' : string,
  'ic_root_key_der' : [] | [Uint8Array | number[]],
  'cycles_ledger' : [] | [Principal],
}
export interface Outpoint { 'txid' : Uint8Array | number[], 'vout' : number }
export interface PatronPaysIcrc2Tokens {
  'ledger' : Principal,
  'patron' : Account,
}
export type PaymentError = {
    'LedgerWithdrawFromError' : {
      'error' : WithdrawFromError,
      'ledger' : Principal,
    }
  } |
  { 'LedgerUnreachable' : CallerPaysIcrc2Tokens } |
  { 'InvalidPatron' : null } |
  {
    'LedgerTransferFromError' : {
      'error' : TransferFromError,
      'ledger' : Principal,
    }
  } |
  { 'UnsupportedPaymentType' : null } |
  { 'InsufficientFunds' : { 'needed' : bigint, 'available' : bigint } };
export type PaymentType = { 'PatronPaysIcrc2Tokens' : PatronPaysIcrc2Tokens } |
  { 'AttachedCycles' : null } |
  { 'CallerPaysIcrc2Cycles' : null } |
  { 'CallerPaysIcrc2Tokens' : CallerPaysIcrc2Tokens } |
  { 'PatronPaysIcrc2Cycles' : Account };
export type RejectionCode = { 'NoError' : null } |
  { 'CanisterError' : null } |
  { 'SysTransient' : null } |
  { 'DestinationInvalid' : null } |
  { 'Unknown' : null } |
  { 'SysFatal' : null } |
  { 'CanisterReject' : null };
export type RejectionCode_1 = { 'NoError' : null } |
  { 'CanisterError' : null } |
  { 'SysTransient' : null } |
  { 'DestinationInvalid' : null } |
  { 'Unknown' : null } |
  { 'SysFatal' : null } |
  { 'CanisterReject' : null };
export type Result = { 'Ok' : GetAddressResponse } |
  { 'Err' : GetAddressError };
export type Result_1 = { 'Ok' : GetBalanceResponse } |
  { 'Err' : GetAddressError };
export type Result_2 = { 'Ok' : SendBtcResponse } |
  { 'Err' : SendBtcError };
export type Result_3 = { 'Ok' : EthAddressResponse } |
  { 'Err' : EthAddressError };
export type Result_4 = { 'Ok' : EthPersonalSignResponse } |
  { 'Err' : EthAddressError };
export type Result_5 = { 'Ok' : EthSignPrehashResponse } |
  { 'Err' : EthAddressError };
export type Result_6 = { 'Ok' : [EcdsaPublicKeyResponse] } |
  { 'Err' : EthAddressError };
export type Result_7 = { 'Ok' : [SignWithEcdsaResponse] } |
  { 'Err' : EthAddressError };
export type Result_8 = { 'Ok' : [EcdsaPublicKeyResponse] } |
  { 'Err' : EthAddressError };
export type Result_9 = { 'Ok' : [SignWithEcdsaResponse] } |
  { 'Err' : EthAddressError };
export type SchnorrAlgorithm = { 'ed25519' : null } |
  { 'bip340secp256k1' : null };
export interface SchnorrKeyId {
  'algorithm' : SchnorrAlgorithm,
  'name' : string,
}
export interface SchnorrPublicKeyArgument {
  'key_id' : SchnorrKeyId,
  'canister_id' : [] | [Principal],
  'derivation_path' : Array<Uint8Array | number[]>,
}
export type SendBtcError = { 'BuildP2wpkhError' : BuildP2wpkhTxError } |
  { 'InternalError' : { 'msg' : string } } |
  { 'PaymentError' : PaymentError };
export interface SendBtcRequest {
  'fee_satoshis' : [] | [bigint],
  'network' : BitcoinNetwork,
  'utxos_to_spend' : Array<Utxo>,
  'address_type' : BitcoinAddressType,
  'outputs' : Array<BtcTxOutput>,
}
export interface SendBtcResponse { 'txid' : string }
export interface SignWithEcdsaArgument {
  'key_id' : EcdsaKeyId,
  'derivation_path' : Array<Uint8Array | number[]>,
  'message_hash' : Uint8Array | number[],
}
export interface SignWithEcdsaResponse { 'signature' : Uint8Array | number[] }
export interface SignWithSchnorrArgument {
  'key_id' : SchnorrKeyId,
  'derivation_path' : Array<Uint8Array | number[]>,
  'message' : Uint8Array | number[],
}
export type TransferFromError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'TemporarilyUnavailable' : null } |
  { 'InsufficientAllowance' : { 'allowance' : bigint } } |
  { 'BadBurn' : { 'min_burn_amount' : bigint } } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'BadFee' : { 'expected_fee' : bigint } } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'TooOld' : null } |
  { 'InsufficientFunds' : { 'balance' : bigint } };
export interface Utxo {
  'height' : number,
  'value' : bigint,
  'outpoint' : Outpoint,
}
export type WithdrawFromError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'TemporarilyUnavailable' : null } |
  { 'InsufficientAllowance' : { 'allowance' : bigint } } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'InvalidReceiver' : { 'receiver' : Principal } } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'TooOld' : null } |
  {
    'FailedToWithdrawFrom' : {
      'withdraw_from_block' : [] | [bigint],
      'rejection_code' : RejectionCode_1,
      'refund_block' : [] | [bigint],
      'approval_refund_block' : [] | [bigint],
      'rejection_reason' : string,
    }
  } |
  { 'InsufficientFunds' : { 'balance' : bigint } };
export interface _SERVICE {
  'btc_caller_address' : ActorMethod<
    [GetAddressRequest, [] | [PaymentType]],
    Result
  >,
  'btc_caller_balance' : ActorMethod<
    [GetBalanceRequest, [] | [PaymentType]],
    Result_1
  >,
  'btc_caller_send' : ActorMethod<
    [SendBtcRequest, [] | [PaymentType]],
    Result_2
  >,
  'config' : ActorMethod<[], Config>,
  'eth_address' : ActorMethod<
    [EthAddressRequest, [] | [PaymentType]],
    Result_3
  >,
  'eth_address_of_caller' : ActorMethod<[[] | [PaymentType]], Result_3>,
  'eth_personal_sign' : ActorMethod<
    [EthPersonalSignRequest, [] | [PaymentType]],
    Result_4
  >,
  'eth_sign_prehash' : ActorMethod<
    [EthSignPrehashRequest, [] | [PaymentType]],
    Result_5
  >,
  'eth_sign_transaction' : ActorMethod<
    [EthSignTransactionRequest, [] | [PaymentType]],
    Result_5
  >,
  'generic_caller_ecdsa_public_key' : ActorMethod<
    [EcdsaPublicKeyArgument, [] | [PaymentType]],
    Result_6
  >,
  'generic_sign_with_ecdsa' : ActorMethod<
    [[] | [PaymentType], SignWithEcdsaArgument],
    Result_7
  >,
  'get_canister_status' : ActorMethod<[], CanisterStatusResultV2>,
  'http_request' : ActorMethod<[HttpRequest], HttpResponse>,
  'schnorr_public_key' : ActorMethod<
    [SchnorrPublicKeyArgument, [] | [PaymentType]],
    Result_8
  >,
  'schnorr_sign' : ActorMethod<
    [SignWithSchnorrArgument, [] | [PaymentType]],
    Result_9
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
