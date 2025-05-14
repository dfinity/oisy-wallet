import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { SplToken } from '$sol/types/spl';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { mockSplAddress } from '$tests/mocks/sol.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';

export const mockValidSplToken: SplToken = {
	...mockValidToken,
	id: parseTokenId('SplTokenId'),
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	address: mockSplAddress,
	owner: TOKEN_PROGRAM_ADDRESS
};

export const mockSplCustomToken: SplCustomToken = {
	...mockValidSplToken,
	id: parseTokenId('SplCustomTokenId2'),
	symbol: 'SplCustomTokenId2',
	address: `${mockValidSplToken.address}2`,
	version: undefined,
	enabled: true
};
