import type { ContractAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import type { RequiredToken, Token, TokenMetadata, TokenStandard } from '$lib/types/token';

type Erc1155Standard = Extract<TokenStandard, 'erc1155'>;

export type Erc1155Token = Erc1155Contract &
	Omit<Token, 'network' | 'standard'> & { network: EthereumNetwork; standard: Erc1155Standard };

export type RequiredErc1155Token = RequiredToken<Erc1155Token>;

export type Erc1155ContractAddress = ContractAddress;
export type Erc1155Contract = Erc1155ContractAddress;

export type Erc1155Metadata = TokenMetadata;

// https://eips.ethereum.org/EIPS/eip-1155#erc-1155-metadata-uri-json-schema
export interface Erc1155UriJson {
	name?: string;
	decimals?: number;
	description?: string;
	image?: string;
	properties?: Record<string, NestedUriJsonPropertyMap>;
}

type NestedUriJsonValue =
	| string
	| number
	| boolean
	| NestedUriJsonValue[]
	| NestedUriJsonPropertyMap;

interface NestedUriJsonPropertyMap {
	[key: string]: NestedUriJsonValue;
}
