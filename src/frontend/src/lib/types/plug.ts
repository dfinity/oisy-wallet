import type { BtcAddress } from '$btc/types/address';
import type { EthAddress } from '$eth/types/address';
import type { Token } from '$lib/types/token';
import type { SolAddress } from '$sol/types/address';

export interface PlugAccount {
	index: number;
	principal: string;
	evmAddress: EthAddress;
	btcAddress: BtcAddress;
	solAddress: SolAddress;
}

export interface PlugBalance {
	token: Token;
	address: string;
	// Undefined means the lookup failed, which is distinct from a zero balance and
	// must stay distinguishable in the UI.
	balance: bigint | undefined;
}
