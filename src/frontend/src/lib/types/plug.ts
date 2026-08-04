import type { BtcAddress } from '$btc/types/address';
import type { EthAddress } from '$eth/types/address';
import type { SolAddress } from '$sol/types/address';

export interface PlugAccount {
	index: number;
	principal: string;
	evmAddress: EthAddress;
	btcAddress: BtcAddress;
	solAddress: SolAddress;
}
