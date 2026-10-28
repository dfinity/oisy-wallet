import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const CRWD_DECIMALS = 18;

export const CRWD_SYMBOL = 'CRWD';

export const CRWD_TOKEN_ID: TokenId = parseTokenId(CRWD_SYMBOL);

export const CRWD_TOKEN: RequiredEvmErc20Token = {
	id: CRWD_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'CrowdStrike Holdings • Robinhood Token',
	symbol: CRWD_SYMBOL,
	decimals: CRWD_DECIMALS,
	icon: robinhoodstock,
	address: '0xea72Ecca2d0f6bFA1394DBBCff85b52CD4233931'
};
