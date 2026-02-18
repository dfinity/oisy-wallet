import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { CBBTC_TOKEN_GROUP } from '$env/tokens/groups/groups.cbbtc.env';
import cbbtc from '$eth/assets/cbbtc.webp';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const CBBTC_DECIMALS = 8;

export const CBBTC_SYMBOL = 'cbBTC';

export const CBBTC_TOKEN_ID: TokenId = parseTokenId(CBBTC_SYMBOL);

export const CBBTC_TOKEN: RequiredSplToken = {
	id: CBBTC_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'Coinbase Wrapped BTC',
	symbol: CBBTC_SYMBOL,
	decimals: CBBTC_DECIMALS,
	icon: cbbtc,
	address: 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij',
	owner: TOKEN_PROGRAM_ADDRESS,
	groupData: CBBTC_TOKEN_GROUP,
	buy: {
		onramperId: 'cbbtc_solana'
	}
};
