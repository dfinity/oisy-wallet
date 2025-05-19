import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { USDT_TOKEN_GROUP } from '$env/tokens/groups/groups.usdt.env';
import usdt from '$eth/assets/usdt.svg';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const USDT_DECIMALS = 6;

export const USDT_SYMBOL = 'USDT';

export const USDT_TOKEN_ID: TokenId = parseTokenId(USDT_SYMBOL);

export const USDT_TOKEN: RequiredEvmBep20Token = {
	id: USDT_TOKEN_ID,
	network: POLYGON_MAINNET_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Tether USD',
	symbol: USDT_SYMBOL,
	decimals: USDT_DECIMALS,
	icon: usdt,
	address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
	exchange: 'erc20',
	groupData: USDT_TOKEN_GROUP,
	buy: {
		onramperId: 'usdt_polygon'
	}
};
