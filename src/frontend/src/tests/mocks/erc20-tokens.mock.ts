import { ETHEREUM_NETWORK } from '$env/networks.env';
import type { Erc20Token } from '$eth/types/erc20';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { mockValidToken } from '$tests/mocks/tokens.mock';

export const mockValidErc20Token: Erc20Token = {
	...mockValidToken,
	id: parseTokenId('Erc20TokenId'),
	address: mockEthAddress,
	network: ETHEREUM_NETWORK,
	exchange: 'erc20'
};
