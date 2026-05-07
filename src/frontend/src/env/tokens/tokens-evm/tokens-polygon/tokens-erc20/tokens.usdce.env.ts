import {POLYGON_MAINNET_NETWORK} from '$env/networks/networks-evm/networks.evm.polygon.env';
import { USDCE_TOKEN_GROUP } from '$env/tokens/groups/groups.usdce.env';
import usdce from '$eth/assets/usdc.svg';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const USDCE_DECIMALS = 6;

export const USDCE_SYMBOL = 'USDC.e';

export const USDCE_TOKEN_ID: TokenId = parseTokenId(USDCE_SYMBOL);

export const USDCE_TOKEN: RequiredEvmErc20Token = {
	id: USDCE_TOKEN_ID,
	network: POLYGON_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }],
	name: 'USD Coin Bridged',
	symbol: USDCE_SYMBOL,
	decimals: USDCE_DECIMALS,
	icon: usdce,
	address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
	groupData: USDCE_TOKEN_GROUP
};
