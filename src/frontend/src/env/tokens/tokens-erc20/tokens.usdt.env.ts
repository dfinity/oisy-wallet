import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { USDT_TOKEN_GROUP } from '$env/tokens/groups/groups.usdt.env';
import usdt from '$eth/assets/usdt.svg';
import type { RequiredErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const USDT_DECIMALS = 6;

export const USDT_SYMBOL = 'USDT';

export const USDT_TOKEN_ID: TokenId = parseTokenId(USDT_SYMBOL);

export const USDT_TOKEN: RequiredErc20Token = {
	id: USDT_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Tether USD',
	symbol: USDT_SYMBOL,
	decimals: USDT_DECIMALS,
	icon: usdt,
	address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
	exchange: 'erc20',
	twinTokenSymbol: 'ckUSDT',
	groupData: USDT_TOKEN_GROUP,
	alwaysShowInTokenGroup: true,
	buy: {
		onramperId: 'usdt_ethereum'
	}
};
