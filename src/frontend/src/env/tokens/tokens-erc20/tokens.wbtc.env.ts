import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { WBTC_TOKEN_GROUP } from '$env/tokens/groups/groups.wbtc.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import wbtc from '$icp-eth/assets/wbtc.svg';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const WBTC_DECIMALS = 8;

export const WBTC_SYMBOL = 'WBTC';

export const WBTC_TOKEN_ID: TokenId = parseTokenId(WBTC_SYMBOL);

export const WBTC_TOKEN: RequiredErc20Token = {
	id: WBTC_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Wrapped BTC',
	symbol: WBTC_SYMBOL,
	decimals: WBTC_DECIMALS,
	icon: wbtc,
	address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
	exchange: 'erc20',
	twinTokenSymbol: 'ckWBTC',
	groupData: WBTC_TOKEN_GROUP,
	alwaysShowInTokenGroup: true,
	buy: {
		onramperId: 'wbtc_ethereum'
	}
};
