// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-ownership-endpoints/get-contracts-for-owner-v-3
import type { NftContractForOwner } from 'alchemy-sdk';

interface Contract {
	address: string;
	name: string;
	tokenType: string;
	isSpam: boolean;
}

export interface AlchemyProviderContracts {
	contracts: NftContractForOwner[];
	pageKey?: string;
	totalCount: number;
}