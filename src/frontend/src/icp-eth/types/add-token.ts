import type { Either } from '$lib/utils/ts.utils';

interface Erc20AddTokenData {
	erc20ContractAddress: string;
}

interface IcAddTokenData {
	ledgerCanisterId: string;
	indexCanisterId: string | undefined;
}

export type AddTokenData = Either<Erc20AddTokenData, IcAddTokenData>;
