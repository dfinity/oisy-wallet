import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const META_DECIMALS = 18;

export const META_SYMBOL = 'META';

export const META_TOKEN_ID: TokenId = parseTokenId(META_SYMBOL);

export const META_TOKEN: RequiredEvmErc20Token = {
	id: META_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Meta Platforms • Robinhood Token',
	symbol: META_SYMBOL,
	decimals: META_DECIMALS,
	icon: robinhoodstock,
	address: '0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35'
};
