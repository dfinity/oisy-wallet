import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { USDG_TOKEN_GROUP } from '$env/tokens/groups/groups.usdg.env';
import usdg from '$eth/assets/usdg.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const USDG_DECIMALS = 6;

export const USDG_SYMBOL = 'USDG';

export const USDG_TOKEN_ID: TokenId = parseTokenId(USDG_SYMBOL);

export const USDG_TOKEN: RequiredEvmErc20Token = {
	id: USDG_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }],
	name: 'Global Dollar',
	symbol: USDG_SYMBOL,
	decimals: USDG_DECIMALS,
	icon: usdg,
	address: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
	groupData: USDG_TOKEN_GROUP,
	buy: {
		onramperId: 'usdg_robinhood'
	}
};
