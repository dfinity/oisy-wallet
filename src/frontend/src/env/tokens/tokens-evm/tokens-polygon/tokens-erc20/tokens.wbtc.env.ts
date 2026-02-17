import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { WBTC_TOKEN_GROUP } from '$env/tokens/groups/groups.wbtc.env';
import wbtc from '$eth/assets/wbtc.webp';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const WBTC_DECIMALS = 8;

export const WBTC_SYMBOL = 'WBTC';

export const WBTC_TOKEN_ID: TokenId = parseTokenId(WBTC_SYMBOL);

export const WBTC_TOKEN: RequiredEvmBep20Token = {
	id: WBTC_TOKEN_ID,
	network: POLYGON_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Wrapped BTC',
	symbol: WBTC_SYMBOL,
	decimals: WBTC_DECIMALS,
	icon: wbtc,
	address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
	groupData: WBTC_TOKEN_GROUP,
	buy: {
		onramperId: 'wbtc_polygon'
	}
};
