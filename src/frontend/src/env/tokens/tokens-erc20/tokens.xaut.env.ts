import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { XAUT_TOKEN_GROUP } from '$env/tokens/groups/groups.xaut.env';
import xaut from '$eth/assets/xaut.svg';
import type { RequiredErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const XAUT_DECIMALS = 6;

export const XAUT_SYMBOL = 'XAUt';

export const XAUT_TOKEN_ID: TokenId = parseTokenId(XAUT_SYMBOL);

export const XAUT_TOKEN: RequiredErc20Token = {
	id: XAUT_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Tether Gold',
	symbol: XAUT_SYMBOL,
	decimals: XAUT_DECIMALS,
	icon: xaut,
	address: '0x68749665FF8D2d112Fa859AA293F07A622782F38',
	exchange: 'erc20',
	twinTokenSymbol: 'ckXAUT',
	groupData: XAUT_TOKEN_GROUP,
	alwaysShowInTokenGroup: true
};
