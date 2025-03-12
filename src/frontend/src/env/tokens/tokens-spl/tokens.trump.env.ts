import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import trump from '$sol/assets/trump.svg';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const TRUMP_DECIMALS = 6;

export const TRUMP_SYMBOL = 'TRUMP';

export const TRUMP_TOKEN_ID: TokenId = parseTokenId(TRUMP_SYMBOL);

export const TRUMP_TOKEN: RequiredSplToken = {
	id: TRUMP_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'OFFICIAL TRUMP',
	symbol: TRUMP_SYMBOL,
	decimals: TRUMP_DECIMALS,
	icon: trump,
	address: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
	owner: TOKEN_PROGRAM_ADDRESS,
	buy: {
		onramperId: 'trump_solana'
	}
};
