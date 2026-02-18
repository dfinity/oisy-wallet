import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { CBBTC_TOKEN_GROUP } from '$env/tokens/groups/groups.cbbtc.env';
import cbbtc from '$eth/assets/cbbtc.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const CBBTC_DECIMALS = 8;

export const CBBTC_SYMBOL = 'cbBTC';

export const CBBTC_TOKEN_ID: TokenId = parseTokenId(CBBTC_SYMBOL);

export const CBBTC_TOKEN: RequiredEvmErc20Token = {
	id: CBBTC_TOKEN_ID,
	network: BASE_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'Coinbase Wrapped BTC',
	symbol: CBBTC_SYMBOL,
	decimals: CBBTC_DECIMALS,
	icon: cbbtc,
	address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
	groupData: CBBTC_TOKEN_GROUP,
	buy: {
		onramperId: 'cbbtc_base'
	}
};
