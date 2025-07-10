import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import floki from '$eth/assets/floki.svg';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const FLOKI_DECIMALS = 9;

const FLOKI_SYMBOL = 'FLOKI';

export const FLOKI_TOKEN_ID: TokenId = parseTokenId(FLOKI_SYMBOL);

export const FLOKI_TOKEN: RequiredAdditionalErc20Token = {
	id: FLOKI_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'FLOKI',
	symbol: FLOKI_SYMBOL,
	decimals: FLOKI_DECIMALS,
	icon: floki,
	address: '0xcf0c122c6b73ff809c693db761e7baebe62b6a2e',
	exchange: 'erc20'
};
