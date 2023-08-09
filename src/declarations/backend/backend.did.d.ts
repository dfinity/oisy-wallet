import type { ActorMethod } from '@dfinity/agent';

export type Arg = { Upgrade: null } | { Init: InitArg };
export interface InitArg {
	ecdsa_key_name: string;
}
export interface SignRequest {
	to: string;
	gas: bigint;
	value: bigint;
	chain_id: bigint;
	nonce: bigint;
	gas_price: bigint;
}
export interface _SERVICE {
	caller_eth_address: ActorMethod<[], string>;
	sign_transaction: ActorMethod<[SignRequest], string>;
}
