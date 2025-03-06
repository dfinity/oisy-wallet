import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import wsol from '$sol/assets/wsol.svg';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const WSOL_DECIMALS = 9;

export const WSOL_SYMBOL = 'WSOL';

export const WSOL_TOKEN_ID: TokenId = parseTokenId(WSOL_SYMBOL);

export const WSOL_TOKEN: RequiredSplToken = {
	id: WSOL_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Wrapped SOL',
	symbol: WSOL_SYMBOL,
	decimals: WSOL_DECIMALS,
	icon: wsol,
	address: 'So11111111111111111111111111111111111111112',
	owner: TOKEN_PROGRAM_ADDRESS,
	buy: {
		onramperId: 'sol'
	}
};
