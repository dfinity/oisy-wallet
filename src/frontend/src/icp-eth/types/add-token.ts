import type { SolAddress } from '$lib/types/address';
import type { OneOf } from '$lib/utils/ts.utils';

interface Erc20AddTokenData {
	erc20ContractAddress: string;
}

interface IcAddTokenData {
	ledgerCanisterId: string;
	indexCanisterId: string | undefined;
}

interface SplAddTokenData {
	splTokenAddress: SolAddress;
}

export type AddTokenData = OneOf<[Erc20AddTokenData, IcAddTokenData, SplAddTokenData]>;
