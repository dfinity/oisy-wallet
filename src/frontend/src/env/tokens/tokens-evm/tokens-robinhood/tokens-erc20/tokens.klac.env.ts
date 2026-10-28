import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const KLAC_DECIMALS = 18;

export const KLAC_SYMBOL = 'KLAC';

export const KLAC_TOKEN_ID: TokenId = parseTokenId(KLAC_SYMBOL);

export const KLAC_TOKEN: RequiredEvmErc20Token = {
	id: KLAC_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'KLA • Robinhood Token',
	symbol: KLAC_SYMBOL,
	decimals: KLAC_DECIMALS,
	icon: robinhoodstock,
	address: '0x96b933C74eCB4A0926b9210cef7b743EF46be2E9'
};
