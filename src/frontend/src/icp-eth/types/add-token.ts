import type { Either } from '$lib/utils/ts.utils';

export interface Erc20AddTokenData {
	contractAddress: string;
}

export interface IcAddTokenData {
	ledgerCanisterId: string;
	indexCanisterId: string | undefined;
}

export type AddTokenData = Either<Erc20AddTokenData, IcAddTokenData>;
