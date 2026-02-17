import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { WBTC_TOKEN_GROUP } from '$env/tokens/groups/groups.wbtc.env';
import wbtc from '$eth/assets/wbtc.webp';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const WBTC_DECIMALS = 8;

export const WBTC_SYMBOL = 'WBTC';

export const WBTC_TOKEN_ID: TokenId = parseTokenId(WBTC_SYMBOL);

export const WBTC_TOKEN: RequiredSplToken = {
	id: WBTC_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	name: 'Wrapped BTC',
	symbol: WBTC_SYMBOL,
	decimals: WBTC_DECIMALS,
	icon: wbtc,
	address: '5XZw2LKTyrfvfiskJ78AMpackRjPcyCif1WhUsPDuVqQ',
	owner: TOKEN_PROGRAM_ADDRESS,
	groupData: WBTC_TOKEN_GROUP,
	buy: {
		onramperId: 'wbtc_solana'
	}
};
