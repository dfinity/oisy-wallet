import type { ContractAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import type { RequiredToken, Token, TokenMetadata, TokenStandard } from '$lib/types/token';
import type { RequiredToken, Token, TokenStandard } from '$lib/types/token';

type Erc1155Standard = Extract<TokenStandard, 'erc1155'>;

export type Erc1155Token = Erc1155Contract &
	Omit<Token, 'network' | 'standard'> & { network: EthereumNetwork; standard: Erc1155Standard };

export type RequiredErc1155Token = RequiredToken<Erc1155Token>;

export type Erc1155ContractAddress = ContractAddress;
export type Erc1155Contract = Erc1155ContractAddress;

export type Erc1155Metadata = TokenMetadata;

