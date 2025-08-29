import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import type { Nft, NftCollectionUi, NonFungibleToken } from '$lib/types/nft';
import type { TokenId } from '$lib/types/token';
import { parseNftId } from '$lib/validation/nft.validation';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockEthAddress } from '$tests/mocks/eth.mock';

export const getMockNonFungibleToken = (params: {
	addresses: string[];
	names: string[];
}): NonFungibleToken[] =>
	params.addresses.map((address, index) => ({
		address,
		category: 'custom',
		decimals: 0,
		id: parseTokenId(String(index)),
		name: params.names[index],
		network: ETHEREUM_NETWORK,
		standard: 'erc1155',
		symbol: params.names[index]
	}));

export const mockValidErc721Nft: Nft = {
	name: 'Beanz 123',
	id: parseNftId(173563),
	imageUrl: 'https://ipfs.io/ipfs/QmUYeQEm8FquanaaiGKkubmvRwKLnMV8T3c4Ph9Eoup9Gy/27.png',
	attributes: [
		{ traitType: 'Background', value: 'Crimson Red' },
		{ traitType: 'Type', value: 'Tone 4' }
	],
	collection: {
		id: parseTokenId('TokenId'),
		address: mockEthAddress,
		network: ETHEREUM_NETWORK,
		standard: 'erc721',
		symbol: 'MC',
		name: 'MyContract'
	}
};

export const mockValidErc1155Nft: Nft = {
	name: 'Nyan',
	id: parseNftId(725432),
	imageUrl: 'https://ipfs.io/ipfs/QmUYeQEm8FquanaaiGKkubmvRwKLnMV8T3c4Ph9Eoup9Gy/27.png',
	attributes: [
		{ traitType: 'Background', value: 'Crimson Red' },
		{ traitType: 'Type', value: 'Tone 4' }
	],
	balance: 2,
	collection: {
		id: parseTokenId('TokenId'),
		address: mockEthAddress,
		network: ETHEREUM_NETWORK,
		standard: 'erc1155',
		symbol: 'NYAN',
		name: 'MyContract'
	}
};

export const mockNftollectionUi: NftCollectionUi = {
	nfts: [{ ...mockValidErc1155Nft, imageUrl: 'https://example.com/nft.png' }, mockValidErc1155Nft],
	collection: {
		name: 'Testcollection',
		address: mockEthAddress,
		network: ETHEREUM_NETWORK,
		standard: 'erc1155',
		symbol: 'testcollection',
		id: 'testcollection' as unknown as TokenId
	}
};

export const [mockNonFungibleToken1]: NonFungibleToken[] = getMockNonFungibleToken({
	addresses: [mockEthAddress],
	names: ['Nft 1']
});
export const [mockNonFungibleToken2]: NonFungibleToken[] = getMockNonFungibleToken({
	addresses: [mockEthAddress],
	names: ['Nft 2']
});
