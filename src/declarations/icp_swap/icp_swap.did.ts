import type { ActorMethod } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

export interface Token {
	address: string;
	standard: string;
}

export interface GetPoolArgs {
	fee: bigint;
	token0: Token;
	token1: Token;
}

export interface PoolData {
	fee: bigint;
	key: string;
	tickSpacing: number;
	token0: Token;
	token1: Token;
	canisterId: Principal;
}

export type Result = { ok: bigint } | { err: Error };

export interface SwapArgs {
	amountIn: string;
	zeroForOne: boolean;
	amountOutMinimum: string;
}

type DepositArgs = { fee: bigint; token: string; amount: bigint; };

type WithdrawArgs = { fee: bigint; token: string; amount: bigint; };

export type Error =
	| { CommonError: null }
	| { InternalError: string }
	| { UnsupportedToken: string }
	| { InsufficientFunds: null };

export type Result_2 = { ok: PoolData[] } | { err: Error };
export type Result_3 = { ok: PoolData } | { err: Error };

export interface _SERVICE {
	getPool: ActorMethod<[GetPoolArgs], Result_3>;
	quote: ActorMethod<[SwapArgs], Result>;
  swap: ActorMethod<[SwapArgs], Result>; 
  deposit: ActorMethod<[DepositArgs], Result>;
  withdraw: ActorMethod<[WithdrawArgs], Result>;
}

export type { _SERVICE as SwapFactoryService };
