import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import usdc from '$eth/assets/usdc.svg';
import type { Erc1155Token, RequiredErc1155Token } from '$eth/types/erc1155';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';

const NYAN_CAT_SYMBOL = 'NYAN';

const NYAN_CAT_TOKEN_ID: TokenId = parseTokenId(NYAN_CAT_SYMBOL);

const NYAN_CAT_TOKEN: RequiredErc1155Token = {
	id: NYAN_CAT_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc1155',
	category: 'custom',
	name: 'Nyan Cat',
	symbol: NYAN_CAT_SYMBOL,
	decimals: 0,
	icon: usdc,
	address: '0xB32979486938AA9694BFC898f35DBED459F44424'
};

const BUILD_AN_APE_SYMBOL = 'BAPES';

const BUILD_AN_APE_TOKEN_ID: TokenId = parseTokenId(BUILD_AN_APE_SYMBOL);

const BUILD_AN_APE_TOKEN: RequiredErc1155Token = {
	id: BUILD_AN_APE_TOKEN_ID,
	network: POLYGON_AMOY_NETWORK,
	standard: 'erc1155',
	category: 'custom',
	name: 'Build an Ape by Reido',
	symbol: BUILD_AN_APE_SYMBOL,
	decimals: 0,
	icon: usdc,
	address: '0x26Dea1f35a2f240968F42330aD9528f416C80A17'
};

export const ERC1155_TOKENS = [NYAN_CAT_TOKEN, BUILD_AN_APE_TOKEN];

export const mockValidErc1155Token: Erc1155Token = {
	...mockValidToken,
	id: parseTokenId('Erc1155TokenId'),
	network: ETHEREUM_NETWORK,
	standard: 'erc1155',
	address: mockEthAddress
};
