import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const ADBE_DECIMALS = 18;

export const ADBE_SYMBOL = 'ADBE';

export const ADBE_TOKEN_ID: TokenId = parseTokenId(ADBE_SYMBOL);

export const ADBE_TOKEN: RequiredEvmErc20Token = {
	id: ADBE_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Adobe • Robinhood Token',
	symbol: ADBE_SYMBOL,
	decimals: ADBE_DECIMALS,
	icon: robinhoodstock,
	address: '0x232B8ed6377BE97813853B0Ac104c4Cda8378d1B'
};
