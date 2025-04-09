import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import ray from '$sol/assets/ray.svg';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const RAY_DECIMALS = 6;

export const RAY_SYMBOL = 'RAY';

export const RAY_TOKEN_ID: TokenId = parseTokenId(RAY_SYMBOL);

export const RAY_TOKEN: RequiredSplToken = {
	id: RAY_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Raydium',
	symbol: RAY_SYMBOL,
	decimals: RAY_DECIMALS,
	icon: ray,
	address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
	owner: TOKEN_PROGRAM_ADDRESS,
	buy: {
		onramperId: 'ray_solana'
	}
};
