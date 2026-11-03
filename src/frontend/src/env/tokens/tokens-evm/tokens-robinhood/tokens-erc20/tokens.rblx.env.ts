import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const RBLX_DECIMALS = 18;

export const RBLX_SYMBOL = 'RBLX';

export const RBLX_TOKEN_ID: TokenId = parseTokenId(RBLX_SYMBOL);

export const RBLX_TOKEN: RequiredEvmErc20Token = {
	id: RBLX_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Roblox • Robinhood Token',
	symbol: RBLX_SYMBOL,
	decimals: RBLX_DECIMALS,
	icon: robinhoodstock,
	address: '0xF0C4BF4C582cb3836e98394b1d4e7B7281101bE8'
};
