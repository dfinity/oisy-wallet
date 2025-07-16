import type { Nft } from '$lib/types/nft';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { parseTokenId } from '$lib/validation/token.validation';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';

export const mockValidNft: Nft = {
	name: 'Beanz 123',
	id: 173563,
	imageUrl: 'https://ipfs.io/ipfs/QmUYeQEm8FquanaaiGKkubmvRwKLnMV8T3c4Ph9Eoup9Gy/27.png',
	attributes: [
		{traitType: 'Background', value: 'Crimson Red'},
		{traitType: 'Type', value: 'Tone 4'}
	],
	contract: {
		id: parseTokenId('TokenId'),
		address: mockEthAddress,
		network: ETHEREUM_NETWORK,
		standard: 'erc721',
		enabled: true,
		name: 'MyContract'
	}
}