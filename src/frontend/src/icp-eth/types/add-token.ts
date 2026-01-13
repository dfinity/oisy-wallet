import type { OneOf } from '$lib/utils/ts.utils';
import type { SolAddress } from '$sol/types/address';

interface EthAddTokenData {
	ethContractAddress: string;
}

interface IcAddTokenData {
	ledgerCanisterId: string;
	indexCanisterId: string | undefined;
}

interface ExtAddTokenData {
	extCanisterId: string;
}

interface Dip721AddTokenData {
	dip721CanisterId: string;
}

interface SplAddTokenData {
	splTokenAddress: SolAddress;
}

export type AddTokenData = OneOf<
	[EthAddTokenData, IcAddTokenData, ExtAddTokenData, Dip721AddTokenData, SplAddTokenData]
>;
