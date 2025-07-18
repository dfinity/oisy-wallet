import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import orca from '$sol/assets/orca.svg';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const ORCA_DECIMALS = 6;

export const ORCA_SYMBOL = 'ORCA';

export const ORCA_TOKEN_ID: TokenId = parseTokenId(ORCA_SYMBOL);

export const ORCA_TOKEN: RequiredSplToken = {
	id: ORCA_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Orca',
	symbol: ORCA_SYMBOL,
	decimals: ORCA_DECIMALS,
	icon: orca,
	address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
	owner: TOKEN_PROGRAM_ADDRESS
};
