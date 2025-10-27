import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { TokenTypes as TokenTypesEnum, type TokenTypes } from '$lib/enums/token-types';
import { NftMediaStatusEnum } from '$lib/schema/nft.schema';
import type { OptionNetworkId } from '$lib/types/network';
import type { Nft, NftCollectionUi, NonFungibleToken } from '$lib/types/nft';
import type { TokenId } from '$lib/types/token';
import { parseNftId } from '$lib/validation/nft.validation';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { readable, writable } from 'svelte/store';

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
	id: parseNftId('173563'),
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
		name: 'MyContract',
		allowExternalContentSource: true
	},
	mediaStatus: NftMediaStatusEnum.OK
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
		id: parseTokenId('TokenId'),
		address: mockEthAddress,
		network: ETHEREUM_NETWORK,
		standard: 'erc1155',
		symbol: 'NYAN',
		name: 'MyContract',
		allowExternalContentSource: true
	},
	mediaStatus: NftMediaStatusEnum.OK,
	acquiredAt: new Date('2023-01-01T00:00:00.000Z')
};

export const mockNftollectionUi: NftCollectionUi = {
	nfts: [{ ...mockValidErc1155Nft, imageUrl: 'https://example.com/nft.png' }, mockValidErc1155Nft],
	collection: {
		name: 'Testcollection',
		address: mockEthAddress,
		network: ETHEREUM_NETWORK,
		standard: 'erc1155',
		symbol: 'testcollection',
		id: 'testcollection' as unknown as TokenId,
		allowExternalContentSource: true
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

export const createMockNftPagesStore = ({
	originSelectedNetwork,
	assetsTab
}: {
	originSelectedNetwork?: OptionNetworkId;
	assetsTab?: TokenTypes;
}) => {
	const { subscribe, set } = writable({
		assetsTab: assetsTab,
		originSelectedNetwork
	});
	return {
		subscribe,
		assetsTab: readable(assetsTab ?? TokenTypesEnum.TOKENS),
		originSelectedNetwork: readable(originSelectedNetwork ?? undefined),
		setAssetsTab: vi.fn(),
		setOriginSelectedNetwork: vi.fn(),
		set
	};
};
