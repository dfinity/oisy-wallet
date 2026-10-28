import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const ANET_DECIMALS = 18;

export const ANET_SYMBOL = 'ANET';

export const ANET_TOKEN_ID: TokenId = parseTokenId(ANET_SYMBOL);

export const ANET_TOKEN: RequiredEvmErc20Token = {
	id: ANET_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Arista • Robinhood Token',
	symbol: ANET_SYMBOL,
	decimals: ANET_DECIMALS,
	icon: robinhoodstock,
	address: '0x28bABD556b60E53663B8615036479a29c2CDd1Bf'
};
