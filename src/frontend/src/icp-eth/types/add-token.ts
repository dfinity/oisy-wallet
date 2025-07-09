import type { SolAddress } from '$lib/types/address';
import type { OneOf } from '$lib/utils/ts.utils';

interface ErcAddTokenData {
	ercContractAddress: string;
}

interface IcAddTokenData {
	ledgerCanisterId: string;
	indexCanisterId: string | undefined;
}

interface SplAddTokenData {
	splTokenAddress: SolAddress;
}

export type AddTokenData = OneOf<[ErcAddTokenData, IcAddTokenData, SplAddTokenData]>;
