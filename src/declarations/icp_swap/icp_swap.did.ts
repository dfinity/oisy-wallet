import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

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

export type Error =
  | { CommonError: null }
  | { InternalError: string }
  | { UnsupportedToken: string }
  | { InsufficientFunds: null };

export type Result_2 = { ok: PoolData[] } | { err: Error };
export type Result_3 = { ok: PoolData } | { err: Error };

export interface _SERVICE {
  getPool: ActorMethod<[GetPoolArgs], Result_3>;
}

export type { _SERVICE as SwapFactoryService };
