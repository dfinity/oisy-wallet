import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import unhx from '$sol/assets/unhx.svg';

export const UNH_DECIMALS = 18;

export const UNH_SYMBOL = 'UNH';

export const UNH_TOKEN_ID: TokenId = parseTokenId(UNH_SYMBOL);

export const UNH_TOKEN: RequiredEvmErc20Token = {
	id: UNH_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'UnitedHealth • Robinhood Token',
	symbol: UNH_SYMBOL,
	decimals: UNH_DECIMALS,
	icon: unhx,
	address: '0xcF364ea52787e289De6F32077834056E3E70D6A8'
};
