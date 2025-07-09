import { mockValidToken } from '$tests/mocks/tokens.mock';
import { parseTokenId } from '$lib/validation/token.validation';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import type { Erc721Token } from '$eth/types/erc721';

export const mockValidErc721Token: Erc721Token = {
	...mockValidToken,
	id: parseTokenId('Erc721TokenId'),
	network: ETHEREUM_NETWORK,
	standard: 'erc721',
	address: mockEthAddress
};