import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { NftMediaStatusEnum } from '$lib/schema/nft.schema';
import type { Nft, NftCollectionUi, NonFungibleToken } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidDip721Token } from '$tests/mocks/dip721-tokens.mock';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';

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
		standard: { code: 'erc1155' },
		symbol: params.names[index]
	}));

export const mockValidErc721Nft: Nft = {
	name: 'Beanz 123',
	id: parseNftId('173563'),
	imageUrl: 'https://ipfs.io/ipfs/QmUYeQEm8FquanaaiGKkubmvRwKLnMV8T3c4Ph9Eoup9Gy/27.png',
	attributes: [
		{ traitType: 'Background', value: 'Crimson Red' },
		{ traitType: 'Type', value: 'Tone 4' }
	],
	collection: {
		...mockValidErc721Token,
		id: parseTokenId('TokenId'),
		symbol: 'MC',
		name: 'MyContract',
		allowExternalContentSource: true
	},
	mediaStatus: {
		image: NftMediaStatusEnum.OK,
		thumbnail: NftMediaStatusEnum.INVALID_DATA
	}
};

export const mockValidErc1155Nft: Nft = {
	name: 'Nyan',
	id: parseNftId('725432'),
	imageUrl: 'https://ipfs.io/ipfs/QmUYeQEm8FquanaaiGKkubmvRwKLnMV8T3c4Ph9Eoup9Gy/27.png',
	attributes: [
		{ traitType: 'Background', value: 'Crimson Red' },
		{ traitType: 'Type', value: 'Tone 4' }
	],
	balance: 2,
	collection: {
		...mockValidErc1155Token,
		id: parseTokenId('TokenId'),
		symbol: 'NYAN',
		name: 'MyContract',
		allowExternalContentSource: true
	},
	mediaStatus: {
		image: NftMediaStatusEnum.OK,
		thumbnail: NftMediaStatusEnum.INVALID_DATA
	},
	acquiredAt: new Date('2023-01-01T00:00:00.000Z')
};

export const mockValidExtNft: Nft = {
	name: 'Mock EXT NFT',
	id: parseNftId('123456'),
	imageUrl: 'https://example.com/mock-ext-nft.png',
	thumbnailUrl: 'https://example.com/mock-ext-nft-thumbnail.png',
	collection: {
		...mockValidExtV2Token,
		address: mockValidExtV2Token.canisterId
	},
	mediaStatus: {
		image: NftMediaStatusEnum.OK,
		thumbnail: NftMediaStatusEnum.OK
	}
};

export const mockValidDip721Nft: Nft = {
	name: 'Mock DIP721 NFT',
	id: parseNftId('987654'),
	collection: {
		...mockValidDip721Token,
		address: mockValidDip721Token.canisterId
	},
	mediaStatus: {
		image: NftMediaStatusEnum.OK,
		thumbnail: NftMediaStatusEnum.OK
	}
};

export const mockNftCollectionUi: NftCollectionUi = {
	nfts: [{ ...mockValidErc1155Nft, imageUrl: 'https://example.com/nft.png' }, mockValidErc1155Nft],
	collection: {
		...mockValidErc1155Token,
		name: 'Testcollection',
		symbol: 'testcollection',
		id: parseTokenId('testcollection'),
		allowExternalContentSource: true
	}
};

export const [mockNonFungibleToken1]: NonFungibleToken[] = getMockNonFungibleToken({
	addresses: [mockValidErc1155Token.address],
	names: ['Nft 1']
});
export const [mockNonFungibleToken2]: NonFungibleToken[] = getMockNonFungibleToken({
	addresses: [mockValidErc1155Token.address],
	names: ['Nft 2']
});
