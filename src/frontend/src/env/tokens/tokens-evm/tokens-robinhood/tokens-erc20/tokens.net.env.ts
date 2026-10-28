import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const NET_DECIMALS = 18;

export const NET_SYMBOL = 'NET';

export const NET_TOKEN_ID: TokenId = parseTokenId(NET_SYMBOL);

export const NET_TOKEN: RequiredEvmErc20Token = {
	id: NET_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Cloudflare • Robinhood Token',
	symbol: NET_SYMBOL,
	decimals: NET_DECIMALS,
	icon: robinhoodstock,
	address: '0x116F00968269B7bfbaD4109cE591d6E74c0601d4'
};
