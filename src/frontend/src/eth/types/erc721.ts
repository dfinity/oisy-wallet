import type { ContractAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import type { RequiredToken, Token, TokenMetadata, TokenStandard } from '$lib/types/token';
import type { TokenState } from '$lib/enums/token-state';

type Erc721Standard = Extract<TokenStandard, 'erc721'>;

export type Erc721Token = Erc721Contract &
	Omit<Token, 'network' | 'standard'> & { network: EthereumNetwork; standard: Erc721Standard, state?: TokenState };

export type RequiredErc721Token = RequiredToken<Erc721Token>;

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
