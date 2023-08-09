import type { ActorMethod } from '@dfinity/agent';

export type Arg = { Upgrade: null } | { Init: InitArg };
export interface InitArg {
	ecdsa_key_name: string;
	chain_id: bigint;
}
export interface _SERVICE {
	caller_eth_address: ActorMethod<[], string>;
	sign_transaction: ActorMethod<[], string>;
}
