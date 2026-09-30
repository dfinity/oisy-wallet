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

interface IcPunksAddTokenData {
	icPunksCanisterId: string;
}

interface Icrc7AddTokenData {
	icrc7CanisterId: string;
}

interface SplAddTokenData {
	splTokenAddress: SolAddress;
}

// As typed: the currency code in any of its accepted spellings, the issuer unchecked. The review
// parses both.
interface XrpAddTokenData {
	xrpCurrency: string;
	xrpIssuer: string;
}

export type AddTokenData = OneOf<
	[
		EthAddTokenData,
		IcAddTokenData,
		ExtAddTokenData,
		Dip721AddTokenData,
		IcPunksAddTokenData,
		Icrc7AddTokenData,
		SplAddTokenData,
		XrpAddTokenData
	]
>;
