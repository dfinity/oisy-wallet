import { ETHEREUM_NETWORK } from '$env/networks.env';
import eurc from '$eth/assets/eurc.svg';
import type { RequiredErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const EURC_DECIMALS = 6;

export const EURC_SYMBOL = 'EURC';

export const EURC_TOKEN_ID: TokenId = parseTokenId(EURC_SYMBOL);

export const EURC_TOKEN: RequiredErc20Token = {
	id: EURC_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Euro Coin',
	symbol: EURC_SYMBOL,
	decimals: EURC_DECIMALS,
	icon: eurc,
	address: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
	exchange: 'erc20',
	twinTokenSymbol: 'ckEURC'
};
