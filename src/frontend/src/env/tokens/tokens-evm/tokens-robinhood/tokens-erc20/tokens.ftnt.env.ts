import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const FTNT_DECIMALS = 18;

export const FTNT_SYMBOL = 'FTNT';

export const FTNT_TOKEN_ID: TokenId = parseTokenId(FTNT_SYMBOL);

export const FTNT_TOKEN: RequiredEvmErc20Token = {
	id: FTNT_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Fortinet • Robinhood Token',
	symbol: FTNT_SYMBOL,
	decimals: FTNT_DECIMALS,
	icon: robinhoodstock,
	address: '0x3FB8976980d486084b2eb4a404BD12e72823958f'
};
