import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const PLTR_DECIMALS = 18;

export const PLTR_SYMBOL = 'PLTR';

export const PLTR_TOKEN_ID: TokenId = parseTokenId(PLTR_SYMBOL);

export const PLTR_TOKEN: RequiredEvmErc20Token = {
	id: PLTR_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Palantir Technologies • Robinhood Token',
	symbol: PLTR_SYMBOL,
	decimals: PLTR_DECIMALS,
	icon: robinhoodstock,
	address: '0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A'
};
