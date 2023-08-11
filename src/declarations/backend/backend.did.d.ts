import type { ActorMethod } from '@dfinity/agent';

export type Arg = { Upgrade: null } | { Init: InitArg };
export interface InitArg {
	ecdsa_key_name: string;
}
export interface SignRequest {
	to: string;
	gas: bigint;
	value: bigint;
	max_priority_fee_per_gas: bigint;
	max_fee_per_gas: bigint;
	chain_id: bigint;
	nonce: bigint;
}
export interface _SERVICE {
	caller_eth_address: ActorMethod<[], string>;
	sign_transaction: ActorMethod<[SignRequest], string>;
}
