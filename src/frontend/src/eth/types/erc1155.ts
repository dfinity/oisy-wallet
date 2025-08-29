import type { ContractAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import type { CustomTokenSection } from '$lib/enums/custom-token-section';
import type { RequiredToken, Token, TokenMetadata, TokenStandard } from '$lib/types/token';

type Erc1155Standard = Extract<TokenStandard, 'erc1155'>;

export type Erc1155Token = Erc1155Contract &
	Omit<Token, 'network' | 'standard'> & {
		network: EthereumNetwork;
		standard: Erc1155Standard;
		enabled: boolean;
		section?: CustomTokenSection;
	};

export type RequiredErc1155Token = RequiredToken<Omit<Erc1155Token, 'section'>>;

export type Erc1155ContractAddress = ContractAddress;
export type Erc1155Contract = Erc1155ContractAddress;

export type Erc1155Metadata = Omit<TokenMetadata, 'name' | 'symbol'> & {
	name?: string;
	symbol?: string;
};

// https://eips.ethereum.org/EIPS/eip-1155#erc-1155-metadata-uri-json-schema
export interface Erc1155UriJson {
	name?: string;
	decimals?: number;
	description?: string;
	image?: string;
	attributes?: { trait_type: string; value: UriJsonPrimitive }[];
	properties?: Record<string, NestedUriJsonValue>;
}

type UriJsonPrimitive = string | number | boolean;

type NestedUriJsonValue = UriJsonPrimitive | UriJsonPrimitive[] | NestedUriJsonPropertyMap;

interface NestedUriJsonPropertyMap {
	[key: string]: NestedUriJsonValue;
}
