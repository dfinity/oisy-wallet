import type { SolAddress } from '$lib/types/address';
import type { OneOf } from '$lib/utils/ts.utils';

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
