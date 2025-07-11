import type { ContractAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import type { NftSchema } from '$lib/schema/nftSchema';
import type { RequiredToken, Token, TokenMetadata } from '$lib/types/token';
import type * as z from 'zod';

export type Erc721Token = Erc721Contract & Omit<Token, 'network'> & { network: EthereumNetwork };

export type RequiredErc721Token = RequiredToken<Erc721Token>;

export type Erc721ContractAddress = ContractAddress;
export type Erc721Contract = Erc721ContractAddress;

export type Erc721Metadata = TokenMetadata;

export type Nft = z.infer<typeof NftSchema>;
