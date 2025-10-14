import type { OneOf } from '$lib/utils/ts.utils';
import type { SolAddress } from '$sol/types/address';

interface EthAddTokenData {
	ethContractAddress: string;
}

interface IcAddTokenData {
	ledgerCanisterId: string;
	indexCanisterId: string | undefined;
}

interface SplAddTokenData {
	splTokenAddress: SolAddress;
}

export type AddTokenData = OneOf<[EthAddTokenData, IcAddTokenData, SplAddTokenData]>;
