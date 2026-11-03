import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const BA_DECIMALS = 18;

export const BA_SYMBOL = 'BA';

export const BA_TOKEN_ID: TokenId = parseTokenId(BA_SYMBOL);

export const BA_TOKEN: RequiredEvmErc20Token = {
	id: BA_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Boeing • Robinhood Token',
	symbol: BA_SYMBOL,
	decimals: BA_DECIMALS,
	icon: robinhoodstock,
	address: '0x4D21483a44Bf67a86b77E3dA301411880797D452'
};
