import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import abbvx from '$sol/assets/abbvx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const ABBVX_DECIMALS = 8;

export const ABBVX_SYMBOL = 'ABBVx';

export const ABBVX_TOKEN_ID: TokenId = parseTokenId(ABBVX_SYMBOL);

export const ABBVX_TOKEN: RequiredSplToken = {
	id: ABBVX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'AbbVie xStock',
	symbol: ABBVX_SYMBOL,
	decimals: ABBVX_DECIMALS,
	icon: abbvx,
	address: 'XswbinNKyPmzTa5CskMbCPvMW6G5CMnZXZEeQSSQoie',
	owner: TOKEN_2022_PROGRAM_ADDRESS
};
