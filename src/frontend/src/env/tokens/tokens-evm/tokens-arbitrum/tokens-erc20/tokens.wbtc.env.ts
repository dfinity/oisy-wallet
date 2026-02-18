import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { WBTC_TOKEN_GROUP } from '$env/tokens/groups/groups.wbtc.env';
import wbtc from '$eth/assets/wbtc.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const WBTC_DECIMALS = 8;

export const WBTC_SYMBOL = 'WBTC';

export const WBTC_TOKEN_ID: TokenId = parseTokenId(WBTC_SYMBOL);

export const WBTC_TOKEN: RequiredEvmErc20Token = {
	id: WBTC_TOKEN_ID,
	network: ARBITRUM_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Wrapped BTC',
	symbol: WBTC_SYMBOL,
	decimals: WBTC_DECIMALS,
	icon: wbtc,
	address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
	groupData: WBTC_TOKEN_GROUP,
	buy: {
		onramperId: 'wbtc_arbitrum'
	}
};
