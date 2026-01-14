import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import pepecoin from '$eth/assets/pepecoin.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const PEPECOIN_DECIMALS = 18;

export const PEPECOIN_SYMBOL = 'pepecoin';

export const PEPECOIN_TOKEN_ID: TokenId = parseTokenId(PEPECOIN_SYMBOL);

export const PEPECOIN_TOKEN: RequiredAdditionalErc20Token = {
	id: PEPECOIN_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'pepeCoin',
	symbol: PEPECOIN_SYMBOL,
	decimals: PEPECOIN_DECIMALS,
	icon: pepecoin,
	address: '0xA9E8aCf069C58aEc8825542845Fd754e41a9489A',
	exchange: 'erc20'
};
