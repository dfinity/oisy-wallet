import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import matic from '$eth/assets/matic.svg';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const MATIC_DECIMALS = 18;

const MATIC_SYMBOL = 'MATIC';

export const MATIC_TOKEN_ID: TokenId = parseTokenId(MATIC_SYMBOL);

export const MATIC_TOKEN: RequiredAdditionalErc20Token = {
	id: MATIC_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Matic Token',
	symbol: MATIC_SYMBOL,
	decimals: MATIC_DECIMALS,
	icon: matic,
	address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
	exchange: 'erc20'
};
