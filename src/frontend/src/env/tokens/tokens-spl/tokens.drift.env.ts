import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import drift from '$sol/assets/drift.svg';
import type { RequiredSplToken } from '$sol/types/spl';

export const DRIFT_DECIMALS = 6;

export const DRIFT_SYMBOL = 'DRIFT';

export const DRIFT_TOKEN_ID: TokenId = parseTokenId(DRIFT_SYMBOL);

export const DRIFT_TOKEN: RequiredSplToken = {
	id: DRIFT_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Drift',
	symbol: DRIFT_SYMBOL,
	decimals: DRIFT_DECIMALS,
	icon: drift,
	address: 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7'
};
