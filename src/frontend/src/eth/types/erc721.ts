import type { ContractAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import type { NonFungibleTokenAppearance } from '$lib/types/nft-ui';
import type { RequiredToken, Token, TokenMetadata, TokenStandardCode } from '$lib/types/token';

type Erc721Standard = Extract<TokenStandardCode, 'erc721'>;

export type Erc721Token = Erc721Contract &
	NonFungibleTokenAppearance &
	Omit<Token, 'network' | 'standard'> & {
		network: EthereumNetwork;
		standard: { code: Erc721Standard; version?: string };
	};

export type RequiredErc721Token = RequiredToken<
	Omit<Erc721Token, 'section' | 'allowExternalContentSource'>
>;

export type Erc721ContractAddress = ContractAddress;
export type Erc721Contract = Erc721ContractAddress;

export type Erc721Metadata = TokenMetadata;

export interface Erc721UriJson {
	name?: string;
	image?: string;
	image_url?: string;
	description?: string;
	attributes?: {
		trait_type: string;
		value: string | number;
	}[];
}
