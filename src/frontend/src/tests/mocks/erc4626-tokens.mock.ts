import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import type { Erc4626Token } from '$eth/types/erc4626';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidToken } from '$tests/mocks/tokens.mock';

export const mockValidErc4626Token: Erc4626Token = {
	...mockValidToken,
	id: parseTokenId('Erc4626TokenId'),
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc4626' },
	address: '0xvaultAddress',
	assetAddress: '0xassetAddress',
	assetDecimals: 6
};
