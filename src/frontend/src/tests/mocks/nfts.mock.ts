import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import type { Nft } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockEthAddress } from '$tests/mocks/eth.mock';

export const mockValidErc721Nft: Nft = {
	name: 'Beanz 123',
	id: parseNftId(173563),
	imageUrl: 'https://ipfs.io/ipfs/QmUYeQEm8FquanaaiGKkubmvRwKLnMV8T3c4Ph9Eoup9Gy/27.png',
	attributes: [
		{ traitType: 'Background', value: 'Crimson Red' },
		{ traitType: 'Type', value: 'Tone 4' }
	],
	contract: {
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
	contract: {
		id: parseTokenId('TokenId'),
		address: mockEthAddress,
		network: ETHEREUM_NETWORK,
		standard: 'erc1155',
		symbol: 'NYAN',
		name: 'MyContract'
	}
};
