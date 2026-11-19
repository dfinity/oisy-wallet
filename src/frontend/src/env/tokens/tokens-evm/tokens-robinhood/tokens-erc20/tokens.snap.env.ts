import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SNAP_DECIMALS = 18;

export const SNAP_SYMBOL = 'SNAP';

export const SNAP_TOKEN_ID: TokenId = parseTokenId(SNAP_SYMBOL);

export const SNAP_TOKEN: RequiredEvmErc20Token = {
	id: SNAP_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Snap • Robinhood Token',
	symbol: SNAP_SYMBOL,
	decimals: SNAP_DECIMALS,
	icon: robinhoodstock,
	address: '0xF6589F11Bc40b669e584073F428B05562F568733'
};
